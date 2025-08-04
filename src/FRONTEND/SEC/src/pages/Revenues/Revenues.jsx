import { useState, useEffect, useCallback } from "react";
import PageHeader from "../../components/common/PageHeader";
import RevenueItem from "../../components/common/revenue/RevenueItem";
import ListContainer from "../../components/common/ListContainer";
import RecipeModal from "../../components/common/modals/RecipeModal";
import DetalhesRevenueModal from "../../components/common/modals/DetalhesRevenueModal";
import ConfirmarExclusãoModal from "../../components/common/modals/ConfirmarExclusãoModal";
import useRevenuesAPI from "../../hooks/useRevenuesAPI";

import ResultSearchContainer from "../../components/common/ResultSearchContainer";
import FeedbackSearch from "../../components/common/FeedbackSearch";

export default function Revenues() {
  const {
    getRecipes,
    deleteRecipe, // Removido 'error: apiErrorFromHook' pois vamos gerenciar os erros diretamente no componente
  } = useRevenuesAPI();

  const [receitas, setReceitas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // Erro para operações de busca/listagem
  const [apiError, setApiError] = useState(null); // Erro para operações de salvar/deletar, exibido em um toast

  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [receitaParaModal, setReceitaParaModal] = useState(null); // Armazena a receita para edição ou null para nova

  const [showDetalhesModal, setShowDetalhesModal] = useState(false);
  const [receitaSelecionada, setReceitaSelecionada] = useState(null);

  const [receitaParaExcluir, setReceitaParaExcluir] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [errorDeleteMsg, setErrorDeleteMsg] = useState(""); // Erro específico do modal de exclusão

  const [showResultadoBusca, setShowResultadoBusca] = useState(false);

  const [termoBuscaAtual, setTermoBuscaAtual] = useState("");
  const [tipoBuscaAtual, setTipoBuscaAtual] = useState("nome");


  const fetchReceitas = useCallback(
    async (termoBusca = "") => {
      setLoading(true);
      setError(null); // Limpa erros de busca anteriores
      setApiError(null); // Limpa erros gerais da API (como os que vêm do RecipeModal)
      try {
        const response = await getRecipes(termoBusca);
        if (response.sucesso) {
          // Formatação para garantir consistência dos dados de ingredientes
          const formattedRecipes = response.recipes.map((recipe) => ({
            ...recipe,
            custoDeProducao: recipe.custoDeProducao || recipe.custo_producao || 0, 
            modoDePreparo: recipe.modoDePreparo || recipe.modo_preparo || recipe.modoPreparo || "",
            ingredientes: (recipe.ingredientes || recipe.ingredients || []).map(
              (ing) => ({
                // Ajuste para 'ingredientes' ou 'ingredients'
                id: ing.idIngrediente || ing.id, // Adapta para o ID do ingrediente
                nome: ing.ingrediente?.nome || ing.nome,
                unidade: ing.ingrediente?.unidadeMedida || ing.unidade,
                preco: ing.ingrediente?.preco || ing.preco,
                quantidadeUsada:
                  ing.qtdUnidade || ing.qtdGramasOuMl || ing.quantidadeUsada, // Adicionado quantidadeUsada
                unidadeUsadaNaReceita:
                  ing.unidade ||
                  ing.ingrediente?.unidadeMedida ||
                  ing.unidadeUsadaNaReceita,
              })
            ),
          }));
          setReceitas(formattedRecipes);
          console.log("Receitas encontradas:", formattedRecipes);
        } else {
          setError(response.mensagem || "Erro ao carregar receitas.");
          setReceitas([]); // Limpa a lista em caso de erro
        }
      } catch (err) {
        console.error("Erro ao buscar receitas:", err);
        setError("Falha na comunicação com o servidor ao carregar receitas.");
        setReceitas([]); // Limpa a lista em caso de erro de rede
      } finally {
        setLoading(false);
      }
    },
    [getRecipes]
  );

  useEffect(() => {
    fetchReceitas();
  }, [fetchReceitas]);

  const abrirEditar = (receita) => {
    setReceitaParaModal(receita);
    setShowRecipeModal(true);
  };

  const abrirDetalhes = (receita) => {
    setReceitaSelecionada(receita);
    setShowDetalhesModal(true);
  };

  const abrirExcluir = (receita) => {
    setReceitaParaExcluir(receita);
    setErrorDeleteMsg("");
    setShowDeleteModal(true);
  };

  const confirmarExclusao = async () => {
    if (!receitaParaExcluir) return;

    setLoading(true);
    setErrorDeleteMsg("");
    try {
      const response = await deleteRecipe(receitaParaExcluir.id);
      if (response.sucesso) {
        // Atualização otimista: remove a receita da lista localmente
        setReceitas((prev) =>
          prev.filter((r) => r.id !== receitaParaExcluir.id)
        );
        setReceitaParaExcluir(null);
        setShowDeleteModal(false);
      } else {
        setErrorDeleteMsg(response.mensagem || "Erro ao excluir receita.");
      }
    } catch (err) {
      console.error("Erro ao excluir receita:", err);
      setErrorDeleteMsg("Erro inesperado ao excluir receita.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (value, tipo) => {
    const termo = value?.trim();

    setTermoBuscaAtual(termo);
    setTipoBuscaAtual(tipo);
    setLoading(true);
    setError(null); // Limpa erros de busca anteriores
    setApiError(null); // Limpa erros gerais da API

    try {
      let response; // Lógica de busca igual ao Stock.jsx: se termo vazio, busca tudo e remove o "resultado da busca" flag
      if (!termo) {
        response = await getRecipes(""); // Busca todas as receitas
        setShowResultadoBusca(false); // Não é mais um resultado de busca, é a lista completa
      } else if (tipo === "nome") {
        response = await getRecipes(termo);
        setShowResultadoBusca(true); // É um resultado de busca por nome
      } else if (tipo === "id") {
        response = await getRecipes(termo); // Sua getRecipes já lida com o termo, mesmo que seja um ID
        setShowResultadoBusca(true); // É um resultado de busca por ID
      }

      if (response.sucesso) {
        const formattedRecipes = (response.recipes || []).map((recipe) => ({
          ...recipe,
          custoDeProducao: recipe.custoDeProducao || recipe.custo_producao || 0,
          modoDePreparo: recipe.modoDePreparo || recipe.modo_preparo || recipe.modoPreparo || "",
          ingredientes: (recipe.ingredientes || recipe.ingredients || []).map(
            (ing) => ({
              id: ing.idIngrediente || ing.id,
              nome: ing.ingrediente?.nome || ing.nome,
              unidade: ing.ingrediente?.unidadeMedida || ing.unidade,
              preco: ing.ingrediente?.preco || ing.preco,
              quantidadeUsada:
                ing.qtdUnidade || ing.qtdGramasOuMl || ing.quantidadeUsada,
              unidadeUsadaNaReceita:
                ing.unidade ||
                ing.ingrediente?.unidadeMedida ||
                ing.unidadeUsadaNaReceita,
            })
          ),
        }));
        setReceitas(formattedRecipes);
        console.log("Receitas encontradas:", formattedRecipes);
      } else {
        setError(response.mensagem || "Erro ao buscar receita.");
        setReceitas([]);
      }
    } catch (err) {
      console.error("Erro na busca de receitas:", err);
      setError("Erro inesperado ao buscar receita.");
      setReceitas([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddRevenue = () => {
    setReceitaParaModal(null); // Limpa para indicar que é uma nova receita
    setShowRecipeModal(true);
  }; // Esta função será chamada pelo RecipeModal após salvar/atualizar

  const handleRecipeSavedOrUpdated = (
    savedRecipeId,
    newOrUpdatedRecipeData
  ) => {
    // É crucial que newOrUpdatedRecipeData venha do RecipeModal
    // Com os dados completos da receita (incluindo ingredientes formatados, ID, etc.)

    // Se for uma criação, o backend deve ter retornado a receita completa
    // Se for uma atualização, o backend também deve ter retornado a receita completa
    // OU o RecipeModal deve ter montado o objeto completo antes de chamar onRecipeSaved

    setReceitas((prevRecipes) => {
      const existingIndex = prevRecipes.findIndex(
        (r) => r.id === savedRecipeId
      );

      if (existingIndex > -1) {
        // Se a receita já existe (edição), substitua-a
        const updatedRecipes = [...prevRecipes];
        updatedRecipes[existingIndex] = newOrUpdatedRecipeData; // Use os dados completos retornados
        return updatedRecipes;
      } else {
        // Se for uma nova receita, adicione-a
        return [...prevRecipes, newOrUpdatedRecipeData]; // Use os dados completos retornados
      }
    });

    setShowRecipeModal(false);
    setReceitaParaModal(null); // Limpa o estado
    setApiError(null); // Limpa qualquer erro que possa ter vindo do modal
  };

  return (
    <div className="flex flex-col p-4 h-screen">
        {" "}
      <PageHeader
        title="Receitas"
        searchPlaceholder="Digite o id ou nome da receita para encontrá-la..."
        onSearch={handleSearch}
        mainAction="Adicionar uma nova receita"
        onMainAction={handleAddRevenue}
        showFilter
        showSort
      />
        {" "}
      {showResultadoBusca ? (
        <div>
            <ResultSearchContainer>
                <FeedbackSearch itens={receitas} error={error} termo={termoBuscaAtual} tipo={tipoBuscaAtual} />
            </ResultSearchContainer>
            
            <ListContainer height="100">
                {loading ? (
                    <div className="p-2 text-gray-700 text-center">
                    Carregando resultados da busca...
                    </div>
                ) : receitas.length === 0 ? (
                    <p className="p-2 text-gray-500 text-center">
                    Nenhuma receita encontrada para os critérios de busca.
                    </p>
                ) : (
                    receitas.map((r) => (
                    <RevenueItem
                        key={r.id}
                        receita={r}
                        onView={() => abrirDetalhes(r)}
                        onEdit={() => abrirEditar(r)}
                        onDelete={() => abrirExcluir(r)}
                    />
                    ))
                )}
            </ListContainer>
        </div>
        ) : (
        <ListContainer height="100">
            {loading ? (
            <div className="p-2 text-gray-700 text-center">
                Carregando receitas...
            </div>
            ) : error ? (
            <div className="p-2 text-red-600 text-center">{error}</div>
            ) : receitas.length === 0 ? (
            <p className="p-2 text-gray-500 text-center">
                Nenhuma receita cadastrada ainda.
            </p>
            ) : (
            receitas.map((r) => (
                <RevenueItem
                key={r.id}
                receita={r}
                onView={() => abrirDetalhes(r)}
                onEdit={() => abrirEditar(r)}
                onDelete={() => abrirExcluir(r)}
                />
            ))
            )}
        </ListContainer>
        )}

      {apiError && ( 
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white p-3 rounded shadow-lg">
               {apiError}   {" "}
        </div>
      )}
        {" "}
      <RecipeModal
        isOpen={showRecipeModal}
        onClose={() => {
          setShowRecipeModal(false);
          setApiError(null);
        }}
        initialRecipeData={receitaParaModal}
        onRecipeSaved={handleRecipeSavedOrUpdated}
      />
        {" "}
      <DetalhesRevenueModal
        isOpen={showDetalhesModal}
        onClose={() => setReceitaSelecionada(null)}
        receita={receitaSelecionada}
      />
        {" "}
      <ConfirmarExclusãoModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setReceitaParaExcluir(null);
          setErrorDeleteMsg("");
        }}
        onConfirm={confirmarExclusao}
        mensagem={`Tem certeza que deseja excluir a receita "${receitaParaExcluir?.nome}"?`}
        errorMsg={errorDeleteMsg}
      />
       {" "}
    </div>
  );
}
