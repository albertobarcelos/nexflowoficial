import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { LoginCredentials } from "@/types/auth";

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      
      // First, authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError) throw authError;

      // Then, check if the user is an administrator
      const { data: adminData, error: adminError } = await supabase
        .from('core_client_users')
        .select(`
          id,
          client_id,
          first_name,
          last_name,
          email,
          role,
          is_active
        `)
        .eq('id', authData.user.id)
        .eq('role', 'administrator')
        .eq('is_active', true)
        .maybeSingle();

      if (adminError) throw adminError;
      
      if (!adminData) {
        await supabase.auth.signOut();
        throw new Error('Usuário não autorizado para acessar o portal administrativo.');
      }

      // Atualizar último login
      await supabase
        .from('core_client_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', authData.user.id);

      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo ao Portal Administrador, ${adminData.first_name} ${adminData.last_name}`,
      });

      navigate("/admin/dashboard");
    } catch (error) {
      console.error('Erro no login:', error);
      toast({
        title: "Erro no login",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao tentar fazer login.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <LoginForm
        portalName="Portal Administrador"
        onSubmit={handleLogin}
        loading={loading}
      />
    </div>
  );
}
