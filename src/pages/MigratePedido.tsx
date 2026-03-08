import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Package, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function MigratePedido() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    oldOrderNumber: '',
    orderDescription: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('order_migrations')
        .insert({
          user_id: user?.id,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone || null,
          old_order_number: formData.oldOrderNumber || null,
          order_description: formData.orderDescription,
          status: 'pending',
        });

      if (error) throw error;

      setSubmitted(true);
      toast({
        title: 'Solicitação enviada!',
        description: 'Analisaremos seu pedido e entraremos em contato em breve.',
      });
    } catch (error) {
      console.error('Erro ao enviar solicitação:', error);
      toast({
        title: 'Erro ao enviar',
        description: 'Tente novamente mais tarde.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white flex items-center justify-center px-4">
        <Card className="max-w-2xl w-full bg-gray-800/50 border-amber-600/30 p-8 text-center">
          <CheckCircle2 className="w-20 h-20 text-amber-400 mx-auto mb-6" />
          
          <h1 className="text-3xl font-bold mb-4">
            Solicitação Recebida!
          </h1>
          
          <p className="text-xl text-gray-300 mb-6">
            Sua solicitação de migração foi enviada com sucesso.
          </p>
          
          <div className="bg-amber-600/10 border border-amber-600/30 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-3 text-amber-400">
              Próximos Passos
            </h2>
            <ul className="text-left space-y-2 text-gray-300">
              <li className="flex items-start">
                <span className="text-amber-400 mr-2">1.</span>
                Nossa equipe analisará seu pedido anterior
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-2">2.</span>
                Você receberá um email com o status da análise
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-2">3.</span>
                Após aprovação, seu pedido será integrado ao sistema
              </li>
              <li className="flex items-start">
                <span className="text-amber-400 mr-2">4.</span>
                Você poderá acompanhar tudo pelo painel de controle
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-amber-600 hover:bg-amber-700 border-2 border-amber-500"
            >
              Ir para Dashboard
            </Button>
            
            <Button
              onClick={() => navigate('/landing')}
              variant="outline"
              className="border-2 border-amber-600 text-amber-400 hover:bg-amber-600/10"
            >
              Voltar ao Início
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-black text-white py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Button
          onClick={() => navigate('/landing')}
          variant="ghost"
          className="mb-6 text-amber-400 hover:text-amber-300"
        >
          <ArrowLeft className="mr-2" />
          Voltar
        </Button>

        <Card className="bg-gray-800/50 border-amber-600/30 p-8">
          <div className="text-center mb-8">
            <Package className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h1 className="text-4xl font-bold mb-4">
              Migrar <span className="text-amber-400">Pedido Anterior</span>
            </h1>
            <p className="text-xl text-gray-300">
              Integre seu pedido anterior à nova estrutura ORDAX
            </p>
          </div>

          <div className="bg-amber-600/10 border border-amber-600/30 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold mb-3 text-amber-400">
              Como funciona a migração?
            </h2>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start">
                <CheckCircle2 className="w-5 h-5 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                Você fornece as informações do seu pedido anterior
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-5 h-5 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                Nossa equipe analisa e valida as informações
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-5 h-5 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                Seu pedido é integrado ao novo sistema de acompanhamento
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-5 h-5 text-amber-400 mr-2 mt-0.5 flex-shrink-0" />
                Você recebe acesso ao painel com todas as informações
              </li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="fullName" className="text-gray-300">
                Nome Completo *
              </Label>
              <Input
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="bg-gray-900 border-amber-600/30 text-white"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <Label htmlFor="email" className="text-gray-300">
                Email *
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-gray-900 border-amber-600/30 text-white"
                placeholder="seu@email.com"
              />
            </div>

            <div>
              <Label htmlFor="phone" className="text-gray-300">
                Telefone (opcional)
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                className="bg-gray-900 border-amber-600/30 text-white"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <Label htmlFor="oldOrderNumber" className="text-gray-300">
                Número do Pedido Anterior (se houver)
              </Label>
              <Input
                id="oldOrderNumber"
                name="oldOrderNumber"
                value={formData.oldOrderNumber}
                onChange={handleChange}
                className="bg-gray-900 border-amber-600/30 text-white"
                placeholder="Ex: #12345 ou referência do pedido"
              />
            </div>

            <div>
              <Label htmlFor="orderDescription" className="text-gray-300">
                Descrição do Pedido *
              </Label>
              <Textarea
                id="orderDescription"
                name="orderDescription"
                value={formData.orderDescription}
                onChange={handleChange}
                required
                className="min-h-[150px] bg-gray-900 border-amber-600/30 text-white"
                placeholder="Descreva seu pedido: qual peça, quando foi feito, status atual, etc."
              />
              <p className="text-sm text-gray-400 mt-2">
                Quanto mais detalhes você fornecer, mais rápida será a análise.
              </p>
            </div>

            <div className="bg-gray-900/50 border border-amber-600/30 rounded-lg p-4">
              <p className="text-sm text-gray-400">
                Ao enviar esta solicitação, você concorda que as informações fornecidas
                sejam analisadas pela equipe ORDAX para fins de migração do pedido.
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white py-6 text-lg border-2 border-amber-500"
            >
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </form>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Dúvidas sobre a migração?{' '}
            <a href="/contato" className="text-amber-400 hover:text-amber-300 underline">
              Entre em contato
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
