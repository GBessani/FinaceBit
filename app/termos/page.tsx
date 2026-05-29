import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-muted-foreground mb-8">Última atualização: 28 de maio de 2026</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8 text-sm leading-7">

          <section>
            <h2 className="text-xl font-semibold mb-3">1. Aceitação dos Termos</h2>
            <p>Ao acessar ou utilizar o <strong>FinaceBit</strong> ("Aplicativo"), você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize o Aplicativo.</p>
            <p className="mt-2">O FinaceBit é operado por <strong>Gabriel Bessani Ferreira</strong>, CPF nº 102.271.849-55, residente em Cianorte, Paraná, Brasil ("Operador").</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Descrição do Serviço</h2>
            <p>O FinaceBit é uma aplicação web gratuita de <strong>gestão financeira pessoal</strong> que permite ao usuário:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Registrar receitas, despesas e transferências</li>
              <li>Cadastrar contas fixas, metas e lançamentos futuros</li>
              <li>Acompanhar investimentos com cotações em tempo real</li>
              <li>Visualizar relatórios e gráficos financeiros</li>
              <li>Interagir com assistente de Inteligência Artificial</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Cadastro e Autenticação</h2>
            <p>O acesso ao FinaceBit é realizado exclusivamente via <strong>Google OAuth 2.0</strong>. Ao fazer login, você autoriza o Aplicativo a acessar seu nome e endereço de e-mail cadastrado no Google.</p>
            <p className="mt-2">Você é responsável por manter a segurança da sua conta Google. O Operador não tem acesso à sua senha do Google.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Uso Permitido</h2>
            <p>Você concorda em utilizar o Aplicativo apenas para fins pessoais e lícitos. É expressamente proibido:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Usar o Aplicativo para fins comerciais sem autorização prévia</li>
              <li>Tentar acessar dados de outros usuários</li>
              <li>Realizar engenharia reversa ou copiar o código-fonte</li>
              <li>Enviar conteúdo ofensivo, ilegal ou malicioso ao assistente de IA</li>
              <li>Sobrecarregar os servidores com requisições automatizadas</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Natureza das Informações Financeiras</h2>
            <p>As informações fornecidas pelo FinaceBit, incluindo cotações de investimentos, cálculos de rendimento, sugestões do assistente de IA e quaisquer análises financeiras, têm caráter <strong>exclusivamente informativo e educacional</strong>.</p>
            <p className="mt-2">O FinaceBit <strong>não é uma instituição financeira</strong>, não oferece serviços de consultoria de investimentos e não é regulado pelo Banco Central do Brasil ou pela CVM. Nenhuma informação do Aplicativo deve ser interpretada como recomendação de investimento ou aconselhamento financeiro profissional.</p>
            <p className="mt-2">Decisões financeiras e de investimento são de <strong>exclusiva responsabilidade do usuário</strong>.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Disponibilidade do Serviço</h2>
            <p>O Operador se esforça para manter o Aplicativo disponível, mas não garante disponibilidade ininterrupta. O serviço pode ser suspenso temporariamente para manutenção, atualizações ou por fatores fora do controle do Operador.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Limitação de Responsabilidade</h2>
            <p>Na máxima extensão permitida pela legislação aplicável, o Operador não se responsabiliza por:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Perdas financeiras decorrentes do uso das informações do Aplicativo</li>
              <li>Interrupções temporárias do serviço</li>
              <li>Imprecisões nas cotações de ativos financeiros fornecidas por APIs de terceiros</li>
              <li>Danos indiretos, incidentais ou consequenciais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Propriedade Intelectual</h2>
            <p>Todo o conteúdo, design, código e funcionalidades do FinaceBit são de propriedade do Operador e protegidos pela legislação de direitos autorais. É proibida a reprodução sem autorização expressa.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Alterações nos Termos</h2>
            <p>O Operador reserva-se o direito de modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas por e-mail ou notificação no Aplicativo. O uso continuado após as alterações constitui aceitação dos novos termos.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Lei Aplicável</h2>
            <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da Comarca de Cianorte, Paraná, para dirimir quaisquer controvérsias.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contato</h2>
            <p>Dúvidas sobre estes Termos: <a href="mailto:gbessani.work.contact@gmail.com" className="text-primary hover:underline">gbessani.work.contact@gmail.com</a></p>
          </section>
        </div>
      </div>
    </div>
  )
}
