export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-extrabold tracking-tight text-black font-[family-name:var(--font-manrope)] mb-2">
        Termos e Condições
      </h1>
      <p className="text-sm text-slate-400 mb-10">Última atualização: 22 de março de 2026</p>

      <div className="prose prose-slate prose-sm max-w-none space-y-8 text-slate-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-black">1. Identificação do responsável</h2>
          <p>
            A plataforma Património Financeiro (acessível em patrimoniofinanceiro.pt) é operada por
            Franklin Carneiro da Silva, com residência em Portugal.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">2. Objetivo da plataforma</h2>
          <p>
            A plataforma permite aos utilizadores agregar e visualizar o seu património financeiro
            pessoal e empresarial, incluindo posições em múltiplas corretoras e bancos, alocação de
            ativos, exposição geográfica e setorial, evolução histórica do património e métricas de
            rentabilidade.
          </p>
          <p>
            As funcionalidades incluem importação de dados via ficheiros CSV ou captura de ecrã,
            enriquecimento automático de dados de ETFs, conversão cambial e análise de fatores.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">3. Limitação de responsabilidade</h2>
          <p>
            A plataforma <strong>não presta aconselhamento fiscal, jurídico ou financeiro</strong>.
            Toda a informação apresentada tem caráter meramente informativo e de apoio à gestão pessoal
            do património.
          </p>
          <p>
            O utilizador é o único responsável pela veracidade dos dados introduzidos e pelas
            decisões financeiras que tome com base na informação apresentada. Recomenda-se a
            consulta de um profissional qualificado antes de tomar decisões de investimento.
          </p>
          <p>
            A plataforma não garante a exatidão, atualidade ou completude dos dados apresentados,
            incluindo cotações, taxas de câmbio ou dados de exposição obtidos de fontes externas.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">4. Acesso e utilização</h2>
          <p>
            O acesso à plataforma requer registo com email e palavra-passe. O utilizador é
            responsável pela segurança das suas credenciais e por toda a atividade realizada na sua
            conta. A partilha de contas é proibida.
          </p>
          <p>
            A plataforma é atualmente disponibilizada de forma gratuita. O responsável reserva-se
            o direito de introduzir planos pagos no futuro, com aviso prévio aos utilizadores.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">5. Tratamento de dados</h2>
          <p>
            Os dados financeiros carregados pelo utilizador são processados exclusivamente para
            efeitos de apresentação e análise no âmbito da plataforma. Os dados não são utilizados
            para quaisquer outros fins. Para mais detalhes, consulte a{' '}
            <a href="/privacidade" className="text-black font-medium underline">Política de Privacidade</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">6. Propriedade intelectual</h2>
          <p>
            Todo o conteúdo da plataforma, incluindo código, design, textos e logótipos, é
            propriedade de Franklin Carneiro da Silva e está protegido por legislação de
            propriedade intelectual aplicável.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">7. Disponibilidade do serviço</h2>
          <p>
            Não é garantido o acesso ininterrupto à plataforma. Poderão ocorrer períodos de
            manutenção ou indisponibilidade sem aviso prévio. O responsável não será responsável
            por quaisquer perdas resultantes da indisponibilidade do serviço.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">8. Alterações aos termos</h2>
          <p>
            Estes termos podem ser atualizados a qualquer momento. As alterações entram em vigor
            após a sua publicação nesta página. A utilização continuada da plataforma após a
            publicação de alterações implica a aceitação dos novos termos.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-black">9. Lei aplicável</h2>
          <p>
            Estes termos são regidos pela legislação portuguesa. Quaisquer litígios serão
            submetidos à jurisdição dos tribunais portugueses competentes.
          </p>
        </section>
      </div>
    </div>
  );
}
