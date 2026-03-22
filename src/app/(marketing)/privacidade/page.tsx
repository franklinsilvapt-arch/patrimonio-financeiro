export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-black font-[family-name:var(--font-manrope)] mb-2">
        Política de Privacidade
      </h1>
      <p className="text-sm text-slate-400 mb-10">Última atualização: 22 de março de 2026</p>

      <div className="prose prose-slate prose-sm max-w-none space-y-8 text-slate-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-black">1. Responsável pelo tratamento</h2>
          <p>
            O responsável pelo tratamento dos dados pessoais recolhidos através da plataforma
            Património Financeiro (patrimoniofinanceiro.pt) é Franklin Carneiro da Silva.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">2. Dados pessoais recolhidos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Dados de conta:</strong> nome e endereço de email, fornecidos no registo.</li>
            <li><strong>Dados financeiros:</strong> ficheiros CSV e capturas de ecrã de corretoras e bancos, carregados voluntariamente pelo utilizador.</li>
            <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador e dados básicos de utilização, recolhidos automaticamente para funcionamento do serviço.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">3. Finalidade do tratamento</h2>
          <p>Os dados pessoais são tratados para as seguintes finalidades:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Prestação do serviço de agregação e visualização de património financeiro.</li>
            <li>Autenticação e gestão da conta do utilizador.</li>
            <li>Cumprimento de obrigações legais aplicáveis.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">4. Base legal</h2>
          <p>
            O tratamento de dados baseia-se na execução do contrato de utilização da plataforma,
            nos interesses legítimos do responsável (funcionamento e segurança do serviço) e no
            cumprimento de obrigações legais, nos termos do Regulamento Geral sobre a Proteção
            de Dados (RGPD).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">5. Conservação dos dados</h2>
          <p>
            Os dados financeiros carregados são conservados enquanto a conta do utilizador estiver
            ativa. Os dados de conta são mantidos durante a vigência da relação contratual. O
            utilizador pode solicitar a eliminação dos seus dados a qualquer momento, resultando
            no encerramento da conta e eliminação de todos os dados associados.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">6. Partilha com terceiros</h2>
          <p>
            Os dados pessoais <strong>não são vendidos nem partilhados com terceiros para fins
            comerciais ou de marketing</strong>. Os dados podem ser partilhados, de forma limitada,
            com prestadores de serviços essenciais ao funcionamento da plataforma (alojamento e
            infraestrutura), estritamente no âmbito da prestação do serviço.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">7. Cookies</h2>
          <p>
            A plataforma utiliza cookies essenciais para autenticação e funcionamento do serviço.
            Não são utilizados cookies de publicidade ou de rastreamento de terceiros.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">8. Medidas de segurança</h2>
          <p>
            São implementadas medidas técnicas e organizativas adequadas para proteger os dados
            pessoais contra acesso não autorizado, perda ou destruição, incluindo encriptação de
            palavras-passe e comunicações seguras (HTTPS). Contudo, nenhum sistema é totalmente
            invulnerável, pelo que não é possível garantir segurança absoluta.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">9. Direitos do utilizador</h2>
          <p>
            Nos termos do RGPD, o utilizador tem direito a:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Aceder aos seus dados pessoais.</li>
            <li>Retificar dados incorretos ou incompletos.</li>
            <li>Solicitar a eliminação dos seus dados.</li>
            <li>Limitar ou opor-se ao tratamento dos dados.</li>
            <li>Portabilidade dos dados.</li>
            <li>Apresentar reclamação junto da Comissão Nacional de Proteção de Dados (CNPD).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">10. Alterações à política</h2>
          <p>
            Esta política pode ser atualizada periodicamente. As alterações entram em vigor após
            a sua publicação nesta página. Recomenda-se a consulta regular desta página.
          </p>
        </section>
      </div>
    </div>
  );
}
