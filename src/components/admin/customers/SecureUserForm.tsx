/**
 * Secure User Form Component
 *
 * Example of a form with automatic input sanitization and validation.
 * Demonstrates best practices for security and UX.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSanitizedForm } from '@/hooks/useSanitizedInput';
import { sanitizeEmail, sanitizePhoneNumber } from '@/lib/security/input-sanitizer';
import { checkRateLimit, RATE_LIMITS, getUserRateLimitKey } from '@/lib/security/rate-limiter';
import { log } from '@/lib/logger';

// Validation schema
const userFormSchema = z.object({
  fullName: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  bio: z.string().max(500, 'Bio deve ter no máximo 500 caracteres').optional(),
});

type UserFormData = z.infer<typeof userFormSchema>;

export interface SecureUserFormProps {
  userId?: string;
  initialData?: Partial<UserFormData>;
  onSubmit: (data: UserFormData) => Promise<void>;
  onCancel?: () => void;
}

export function SecureUserForm({
  userId,
  initialData = {},
  onSubmit,
  onCancel
}: SecureUserFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Use sanitized form hook
  const {
    formData,
    setValue,
    getSanitizedData
  } = useSanitizedForm<UserFormData>(
    {
      fullName: initialData.fullName || '',
      email: initialData.email || '',
      phone: initialData.phone || '',
      bio: initialData.bio || ''
    },
    {
      fullName: 'text',
      email: 'email',
      phone: 'text',
      bio: 'html' // Allow some HTML in bio
    }
  );

  // React Hook Form for validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    values: formData
  });

  const onSubmitForm = async (_data: UserFormData) => {
    // Check rate limit
    if (userId) {
      const rateLimitKey = getUserRateLimitKey(userId, 'profile-update');
      const rateLimit = checkRateLimit(rateLimitKey, RATE_LIMITS.api);

      if (!rateLimit.allowed) {
        toast({
          title: 'Muitas requisições',
          description: `Aguarde ${rateLimit.retryAfter} segundos antes de tentar novamente.`,
          variant: 'destructive'
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Get sanitized data
      const sanitizedData = getSanitizedData();

      // Additional sanitization for specific fields
      const finalData: UserFormData = {
        ...sanitizedData,
        email: sanitizeEmail(sanitizedData.email),
        phone: sanitizePhoneNumber(sanitizedData.phone)
      };

      // Submit
      await onSubmit(finalData);

      toast({
        title: 'Sucesso',
        description: 'Dados salvos com sucesso!'
      });
    } catch (error) {
      log.error('Form submission error', { error, userId });

      if (error instanceof Error) {
        toast({
          title: 'Erro',
          description: error.message,
          variant: 'destructive'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-4">
      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName">
          Nome Completo <span className="text-red-500">*</span>
        </Label>
        <Input
          id="fullName"
          {...register('fullName')}
          value={formData.fullName}
          onChange={(e) => setValue('fullName', e.target.value)}
          placeholder="Digite seu nome completo"
          disabled={isSubmitting}
        />
        {errors.fullName && (
          <p className="text-sm text-red-500">{errors.fullName.message}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">
          Email <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          value={formData.email}
          onChange={(e) => setValue('email', e.target.value)}
          placeholder="seu@email.com"
          disabled={isSubmitting}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email.message}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone">
          Telefone <span className="text-red-500">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          {...register('phone')}
          value={formData.phone}
          onChange={(e) => setValue('phone', e.target.value)}
          placeholder="(11) 99999-9999"
          disabled={isSubmitting}
        />
        {errors.phone && (
          <p className="text-sm text-red-500">{errors.phone.message}</p>
        )}
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="bio">Bio (opcional)</Label>
        <Textarea
          id="bio"
          {...register('bio')}
          value={formData.bio}
          onChange={(e) => setValue('bio', e.target.value)}
          placeholder="Conte um pouco sobre você..."
          rows={4}
          disabled={isSubmitting}
        />
        {errors.bio && (
          <p className="text-sm text-red-500">{errors.bio.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Máximo 500 caracteres. HTML básico permitido.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </form>
  );
}
