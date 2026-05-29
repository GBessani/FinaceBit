import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 28 de maio de 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-7">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introdução</h2>
            <p>Esta Política de Privacidade descreve como o <strong>FinaceBit</strong>, operado por <strong>Gabriel Bessani Ferreira</strong> (CPF 102.271.849-55), coleta, usa, armazena e protege seus dados pessoais, em conformidade com a <strong>Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD)</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Dados Coletados</h2>
            <h3 className="font-semibold mt-4 mb-2">2.1 Dados fornecidos via Google OAuth</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Nome completo</strong> — para personalização da interface</li>
              <li><strong>Endereço de e-mail</strong> — para identificação da conta</li>
              <li><strong>Foto de perfil</strong> — exibida no menu lateral (opcional)</li>
            </ul>
            <h3 className="font-semibold mt-4 mb-2">2.2 Dados financeiros inseridos pelo usuário</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Transações de receitas e despesas</li>
              <li>Contas fixas, metas e lançamentos futuros</li>
              <li>Dados de investimentos (ativos, quantidades, preços)</li>
              <li>Categorias personalizadas</li>
            </ul>
            <h3 className="font-semibold mt-4 mb-2">2.3 Dados técnicos coletados automaticamente</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Endereço IP (para rate limiting da API)</li>
              <li>Dados de sessão em cookies seguros (HttpOnly)</li>
            </ul>
            <p className="mt-3"><strong>Não coletamos:</strong> dados bancários, senhas, números de cartão de crédito ou qualquer dado de acesso a contas financeiras externas.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Finalidade do Tratamento</h2>
            <p>Seus dados são utilizados exclusivamente para:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Autenticar e identificar sua conta</li>
              <li>Armazenar e exibir seus dados financeiros pessoais</li>
              <li>Fornecer análises e relatórios financeiros</li>
              <li>Alimentar o assistente de IA com contexto financeiro (sem enviar dados a terceiros para treinamento)</li>
              <li>Prevenir abusos e garantir a segurança do serviço</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Base Legal (LGPD)</h2>
            <p>O tratamento dos seus dados é fundamentado em:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Consentimento</strong> (Art. 7º, I): ao aceitar estes termos e fazer login</li>
              <li><strong>Execução de contrato</strong> (Art. 7º, V): para fornecer as funcionalidades do Aplicativo</li>
              <li><strong>Legítimo interesse</strong> (Art. 7º, IX): para segurança e prevenção de fraudes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Compartilhamento de Dados</h2>
            <p>Seus dados podem ser processados pelos seguintes serviços de infraestrutura:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Supabase</strong> (Supabase Inc.) — banco de dados PostgreSQL hospedado na região São Paulo</li>
              <li><strong>Vercel</strong> (Vercel Inc.) — hospedagem da aplicação web</li>
              <li><strong>Google LLC</strong> — autenticação via OAuth 2.0</li>
              <li><strong>Groq Inc.</strong> — processamento das mensagens do assistente de IA (sem armazenamento permanente)</li>
            </ul>
            <p className="mt-3"><strong>Não vendemos, alugamos ou compartilhamos</strong> seus dados pessoais com terceiros para fins comerciais ou publicitários.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Segurança dos Dados</h2>
            <p>Adotamos as seguintes medidas de segurança:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Criptografia em trânsito via HTTPS/TLS</li>
              <li>Row Level Security (RLS) no banco de dados — cada usuário acessa apenas seus próprios dados</li>
              <li>Tokens JWT em cookies HttpOnly (não acessíveis via JavaScript)</li>
              <li>Autenticação OAuth 2.0 sem armazenamento de senhas</li>
              <li>Backups automáticos diários pelo Supabase</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Retenção de Dados</h2>
            <p>Seus dados são mantidos enquanto sua conta estiver ativa. Após a exclusão da conta, os dados são removidos em até <strong>30 dias</strong>, exceto quando a retenção for exigida por lei.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Seus Direitos (LGPD)</h2>
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li><strong>Acesso</strong> — saber quais dados temos sobre você</li>
              <li><strong>Correção</strong> — corrigir dados incompletos ou desatualizados</li>
              <li><strong>Exclusão</strong> — solicitar a remoção dos seus dados</li>
              <li><strong>Portabilidade</strong> — receber seus dados em formato estruturado</li>
              <li><strong>Revogação do consentimento</strong> — a qualquer momento</li>
              <li><strong>Informação</strong> — sobre compartilhamento com terceiros</li>
            </ul>
            <p className="mt-3">Para exercer esses direitos, entre em contato: <a href="mailto:gbessani.work.contact@gmail.com" className="text-primary hover:underline">gbessani.work.contact@gmail.com</a></p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Cookies</h2>
            <p>Utilizamos apenas cookies essenciais para autenticação e manutenção da sessão. Não utilizamos cookies de rastreamento, publicidade ou analytics de terceiros.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Menores de Idade</h2>
            <p>O FinaceBit não é direcionado a menores de 18 anos. Se identificarmos o cadastro de um menor, a conta será removida.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Alterações nesta Política</h2>
            <p>Podemos atualizar esta Política periodicamente. Alterações significativas serão comunicadas por e-mail com antecedência de 15 dias.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Encarregado (DPO)</h2>
            <p>Responsável pelo tratamento de dados pessoais:<br />
            <strong>Gabriel Bessani Ferreira</strong><br />
            E-mail: <a href="mailto:gbessani.work.contact@gmail.com" className="text-primary hover:underline">gbessani.work.contact@gmail.com</a><br />
            Cianorte, Paraná, Brasil</p>
          </section>
        </div>
      </div>
    </div>
  )
}
