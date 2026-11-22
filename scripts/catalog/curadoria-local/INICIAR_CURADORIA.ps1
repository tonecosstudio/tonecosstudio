# TONART Curadoria - single Windows-host lifecycle, independent from OrdaX MCP.
# Deploy this script alongside tonart_curadoria.py and the local .venv.
[CmdletBinding()]
param(
    [switch]$NoBrowser,
    [switch]$Uninstall
)
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$root = [IO.Path]::GetFullPath((Split-Path -Parent $PSCommandPath)).TrimEnd('\')
$python = Join-Path $root '.venv\Scripts\pythonw.exe'
$entrypoint = Join-Path $root 'tonart_curadoria.py'
$endpoint = 'http://127.0.0.1:8769'
$taskName = 'TONART Curadoria Host'
$owner = [Security.Principal.WindowsIdentity]::GetCurrent()
$launchArgs = '"' + $entrypoint + '"'

function Test-TonartHealth {
    try {
        $health = Invoke-RestMethod -Uri ($endpoint + '/health') -TimeoutSec 2
        return ($health.ok -eq $true -and $health.service -ceq 'tonart-curadoria-local')
    } catch { return $false }
}

function Assert-OwnedTask {
    param($Task)
    if ($null -eq $Task) { return }
    $principalId = [string]$Task.Principal.UserId
    if ($principalId -ine $owner.Name -and $principalId -ine $owner.User.Value) {
        # Task Scheduler normalizes DOMAIN\\user to a short local account.
        # Compare resolved SIDs, never a prefix/suffix of the account name.
        $resolvedSid = try {
            ([Security.Principal.NTAccount]::new($principalId)).Translate(
                [Security.Principal.SecurityIdentifier]
            ).Value
        } catch { '' }
        if ($resolvedSid -cne $owner.User.Value) {
            throw 'A tarefa TONART pertence a outro usuario; nao alterar.'
        }
    }
    $actions = @($Task.Actions)
    if ($actions.Count -ne 1 -or
        [IO.Path]::GetFullPath([string]$actions[0].Execute) -ine $python -or
        [string]$actions[0].Arguments -cne $launchArgs -or
        [IO.Path]::GetFullPath([string]$actions[0].WorkingDirectory) -ine $root) {
        throw 'Tarefa TONART com o mesmo nome usa outra acao; nao alterar.'
    }
}

if (!(Test-Path -LiteralPath $python -PathType Leaf) -or
    !(Test-Path -LiteralPath $entrypoint -PathType Leaf)) {
    throw 'Host TONART ou Python privado ausente na pasta de curadoria.'
}

$existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Assert-OwnedTask $existing
if ($Uninstall) {
    if ($null -ne $existing) {
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction Stop
    }
    Write-Output 'TONART_HOST_SCHEDULE_REMOVED'
    exit 0
}

# One scheduler-owned Python process is the host. No extra HTTP server, IPC,
# task polling loop, database copy, or dependency on the OrdaX MCP process.
if ($null -eq $existing) {
    if (Test-TonartHealth) {
        throw 'Curadoria ja executa sem task owner; encerre apenas a instancia antiga antes de registrar.'
    }
    $action = New-ScheduledTaskAction -Execute $python -Argument $launchArgs -WorkingDirectory $root
    $trigger = New-ScheduledTaskTrigger -AtLogOn -User $owner.Name
    $principal = New-ScheduledTaskPrincipal -UserId $owner.Name -LogonType Interactive -RunLevel Limited
    $settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew `
        -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) `
        -ExecutionTimeLimit ([TimeSpan]::Zero) -StartWhenAvailable `
        -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger `
        -Principal $principal -Settings $settings -ErrorAction Stop | Out-Null
    $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
    Assert-OwnedTask $existing
    Write-Output 'TONART_HOST_SCHEDULE_REGISTERED'
}

if (!(Test-TonartHealth)) {
    $state = (Get-ScheduledTask -TaskName $taskName -ErrorAction Stop).State
    if ($state -ne 'Running') {
        Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
    }
    $healthy = $false
    for ($i=0; $i -lt 35; $i++) {
        if (Test-TonartHealth) { $healthy = $true; break }
        Start-Sleep -Milliseconds 500
    }
    if (!$healthy -and $state -eq 'Running') {
        # A task stuck in Running can hide a dead HTTP listener. Recover only
        # after the initial grace period and only after verifying task ownership.
        $current = Get-ScheduledTask -TaskName $taskName -ErrorAction Stop
        Assert-OwnedTask $current
        if ($current.State -eq 'Running') {
            Stop-ScheduledTask -TaskName $taskName -ErrorAction Stop
        }
        # A venv pythonw launcher may leave its Python child alive after
        # the scheduler stops the parent. Never terminate unrelated Python jobs.
        $orphaned = @(Get-CimInstance Win32_Process -Filter "Name='pythonw.exe'" |
            Where-Object { $_.CommandLine -and $_.CommandLine.Contains($launchArgs) })
        foreach ($process in $orphaned) {
            Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
        }
        $stopped = $false
        for ($i=0; $i -lt 20; $i++) {
            if ((Get-ScheduledTask -TaskName $taskName -ErrorAction Stop).State -ne 'Running') {
                $stopped = $true
                break
            }
            Start-Sleep -Milliseconds 250
        }
        if (!$stopped) { throw 'Tarefa TONART nao parou; reinicio abortado.' }
        if (Test-TonartHealth) {
            $healthy = $true
        } else {
            Start-ScheduledTask -TaskName $taskName -ErrorAction Stop
            for ($i=0; $i -lt 35; $i++) {
                if (Test-TonartHealth) { $healthy = $true; break }
                Start-Sleep -Milliseconds 500
            }
        }
    }
    if (!$healthy) { throw 'Curadoria nao iniciou; consultar historico da task TONART.' }
}
if (!$NoBrowser) { Start-Process $endpoint }
Write-Output ('TONART_HOST_READY ' + $endpoint)
