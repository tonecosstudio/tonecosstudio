interface NavigateInAppOptions {
  force?: boolean;
}

export function navigateInApp(path: string, options: NavigateInAppOptions = {}): void {
  if (window.location.pathname !== path) {
    window.history.pushState({}, "", path);
  } else if (!options.force) {
    return;
  }

  window.dispatchEvent(new PopStateEvent("popstate"));
}
