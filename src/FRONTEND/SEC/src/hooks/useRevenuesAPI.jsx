import { useCallback } from "react"; // Removido useState
import axios from "axios";

export default function useRevenuesAPI() {
  // REMOVIDO: const [loading, setLoading] = useState(false);
  // REMOVIDO: const [error, setError] = useState(null);

  const getApi = () =>
    axios.create({
      baseURL: "http://localhost:3000/api_confeitaria/super/receitas", // Base URL for recipe-related routes
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
        'Cache-Control': 'no-cache',
      },
    });

  const getRecipes = useCallback(async (nome = '') => {
    try {
      let url = "/";
      if (nome && nome.trim() !== "") {
        url = `/?nome=${encodeURIComponent(nome)}`;
      }
      const resposta = await getApi().get(url);
      // Retorna a resposta já no formato esperado pelo componente, incluindo 'sucesso'
      return {
        sucesso: true,
        recipes: resposta.data.receitas || [],
        mensagem: resposta.data.msg || "Receitas carregadas com sucesso!"
      };
    } catch (err) {
      console.error("Erro em getRecipes (hook):", err);
      // Retorna um objeto de erro padronizado
      const mensagemErro = err.response?.data?.msg || "Erro ao buscar receitas.";
      return {
        sucesso: false,
        recipes: [],
        mensagem: mensagemErro
      };
    }
  }, []);

  const getRecipeById = useCallback(async (id) => {
    try {
      const resposta = await getApi().get(`/${id}`);
      // Adaptação: Sua API retorna 'receita' singular para busca por ID
      return {
        sucesso: true,
        recipes: resposta.data.receita ? [resposta.data.receita] : [],
        mensagem: resposta.data.msg || "Receita encontrada por ID!"
      };
    } catch (error) {
      console.error(`Error fetching recipe with ID ${id}:`, error);
      const mensagemErro = error.response?.data?.msg || `Erro ao buscar receita com ID ${id}.`;
      return {
        sucesso: false,
        recipes: [],
        mensagem: mensagemErro
      };
    }
  }, []);

  const createRecipe = useCallback(async (dados) => {
    try {
      const resposta = await getApi().post("/", dados);
      return { sucesso: true, mensagem: resposta.data.msg || "Receita criada com sucesso!", recipe: resposta.data }; 
    } catch (erro) {
      const mensagemErro =
        erro.response?.data?.error ||
        erro.response?.data?.msg ||
        "Erro ao cadastrar receita.";
      return { sucesso: false, mensagem: mensagemErro };
    }
  }, []);

  const updateRecipe = useCallback(async (id, dados) => {
    try {
      const resposta = await getApi().put(`/${id}`, dados);
      return { sucesso: true, mensagem: resposta.data.msg || "Receita atualizada com sucesso!", recipe: resposta.data.receita };
    } catch (erro) {
      const mensagemErro =
        erro.response?.data?.error ||
        erro.response?.data?.msg ||
        "Erro ao atualizar receita.";
      return { sucesso: false, mensagem: mensagemErro };
    }
  }, []);

  const deleteRecipe = useCallback(async (id) => {
    try {
      const resposta = await getApi().delete(`/${id}`);
      return { sucesso: true, mensagem: resposta.data.msg };
    } catch (erro) {
      const mensagemErro =
        erro.response?.data?.error ||
        erro.response?.data?.msg ||
        "Erro ao deletar receita.";
      return { sucesso: false, mensagem: mensagemErro };
    }
  }, []);

  const checkRecipeUsageForEdit = useCallback(async (id) => {
    try {
      const checkApi = axios.create({
        baseURL: "http://localhost:3000/api_confeitaria/receitas",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          'Cache-Control': 'no-cache',
        },
      });

      const resposta = await checkApi.get(`/${id}/checar-uso-para-edicao`);
      return {
        sucesso: true,
        inUse: resposta.data.inUse || false,
        msg: resposta.data.msg,
        affectedOrders: resposta.data.affectedOrders || []
      };
    } catch (error) {
      console.error(`Error checking recipe usage for ID ${id}:`, error);
      const mensagemErro =
        error.response?.data?.error ||
        error.response?.data?.msg ||
        "Erro ao verificar uso da receita para edição.";
      return { sucesso: false, inUse: false, msg: mensagemErro, affectedOrders: [] };
    }
  }, []);

  const addIngredientToRecipe = useCallback(async (idReceita, dados) => {
    try {
      const resposta = await getApi().post(`/${idReceita}/ingredientes`, dados);
      return { sucesso: true, mensagem: resposta.data.message, ingredient: resposta.data.novoIngrediente };
    } catch (erro) {
      const mensagemErro =
        erro.response?.data?.error ||
        erro.response?.data?.message ||
        "Erro ao adicionar ingrediente à receita.";
      return { sucesso: false, mensagem: mensagemErro };
    }
  }, []);

  const updateRecipeIngredient = useCallback(async (idReceita, idIngrediente, dados) => {
    try {
      const resposta = await getApi().put(`/${idReceita}/ingredientes/${idIngrediente}`, dados);
      return { sucesso: true, mensagem: resposta.data.message, ingredient: resposta.data.ingredienteAtualizado };
    } catch (erro) {
      const mensagemErro =
        erro.response?.data?.error ||
        erro.response?.data?.message ||
        "Erro ao atualizar ingrediente da receita.";
      return { sucesso: false, mensagem: mensagemErro };
    }
  }, []);

  const deleteRecipeIngredient = useCallback(async (idReceita, idIngrediente) => {
    try {
      const resposta = await getApi().delete(`/${idReceita}/ingredientes/${idIngrediente}`);
      return { sucesso: true, mensagem: resposta.data.message };
    } catch (erro) {
      const mensagemErro =
        erro.response?.data?.error ||
        erro.response?.data?.message ||
        "Erro ao deletar ingrediente da receita.";
      return { sucesso: false, mensagem: mensagemErro };
    }
  }, []);

  return {
    getRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    checkRecipeUsageForEdit,
    addIngredientToRecipe,
    updateRecipeIngredient,
    deleteRecipeIngredient,
  };
}