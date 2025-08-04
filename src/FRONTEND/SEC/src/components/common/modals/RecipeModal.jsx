import { useState, useEffect, useCallback } from "react";

import IngredientSelectorModal from "./IngredientSelectorModal";

import useRevenuesAPI from "../../../hooks/useRevenuesAPI";

export default function RecipeModal({
  isOpen,
  onClose,
  onRecipeSaved,
  initialRecipeData,
}) {
  const {
    createRecipe,
    updateRecipe,
    addIngredientToRecipe,
    updateRecipeIngredient,
    deleteRecipeIngredient,
  } = useRevenuesAPI();

  const [idReceita, setIdReceita] = useState(null);
  const [nome, setNome] = useState("");
  const [rendimento, setRendimento] = useState("");
  const [ingredientesSelecionados, setIngredientesSelecionados] = useState([]);
  const [custoProducao, setCustoProducao] = useState("0.00");
  const [modoPreparo, setModoPreparo] = useState("");
  const [mostrarModoPreparo, setMostrarModoPreparo] = useState(false);
  const [showIngredientesModal, setShowIngredientesModal] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [originalIngredientsForEdit, setOriginalIngredientsForEdit] = useState(
    []
  );

  useEffect(() => {
    if (isOpen) {
      setApiError("");
      setErrors({});
      if (initialRecipeData) {
        setIdReceita(initialRecipeData.id);
        setNome(initialRecipeData.nome || ""); // GARANTINDO QUE RENDIMENTO SEJA SEMPRE STRING AO INICIAR
        setRendimento(String(initialRecipeData.rendimento || ""));
        setModoPreparo(initialRecipeData.modo_preparo || ""); // Mapeie os ingredientes existentes para o formato esperado pelo seu modal // Ajuste aqui se 'unidade' está vindo de forma diferente do backend
        setMostrarModoPreparo(!!initialRecipeData.modo_preparo);
        const mappedIngredients = (initialRecipeData.ingredientes || [])
        .filter((ri) => ri.ingrediente) // <-- evita erro de leitura
        .map((ri) => ({
          id: ri.ingrediente.id,
          nome: ri.ingrediente.nome,
          unidade: ri.unidade || ri.ingrediente.unidadeMedida,
          precoCusto: ri.ingrediente.precoCusto,
          quantidadeUsada: ri.qtdUnidade || ri.qtdGramasOuMl,
        }));

        setIngredientesSelecionados(mappedIngredients);
        setOriginalIngredientsForEdit(mappedIngredients); // O cálculo do custo de produção deve ser feito com base nos dados que você tem, // mas o backend também o recalcula. Isso é mais para exibição no frontend.
        const total = mappedIngredients.reduce((soma, ingrediente) => {
          const precoCusto = parseFloat(ingrediente.precoCusto || 0);
          const quantidade = parseFloat(ingrediente.quantidadeUsada || 0);
          return soma + precoCusto * quantidade;
        }, 0);
        setCustoProducao(total.toFixed(2));
      } else {
        setIdReceita(null);
        setNome("");
        setRendimento("");
        setIngredientesSelecionados([]);
        setOriginalIngredientsForEdit([]);
        setCustoProducao("0.00");
        setModoPreparo("");
        setMostrarModoPreparo(false);
      }
    }
  }, [isOpen, initialRecipeData]);

  useEffect(() => {
    const total = ingredientesSelecionados.reduce((soma, ingrediente) => {
      const precoCusto = parseFloat(ingrediente.precoCusto || 0);
      const quantidade = parseFloat(ingrediente.quantidadeUsada || 0);
      return soma + precoCusto * quantidade;
    }, 0);

    setCustoProducao(total.toFixed(2));
  }, [ingredientesSelecionados]);

  const validate = useCallback(() => {
    const newErrors = {};

    if (!nome.trim()) {
      newErrors.nome = "O nome da receita é obrigatório.";
    } // VALIDAÇÃO PARA RENDIMENTO COMO STRING E OBRIGATÓRIO
    if (!rendimento.trim()) {
      newErrors.rendimento = "O rendimento é obrigatório.";
    } else {
      const rendimentoNum = parseFloat(rendimento);

      if (isNaN(rendimentoNum) || rendimentoNum <= 0) {
        newErrors.rendimento =
          "O rendimento deve ser um número válido maior que zero.";
      }
    } // FIM DA VALIDAÇÃO PARA RENDIMENTO

    if (ingredientesSelecionados.length === 0) {
      newErrors.ingredientes = "A receita deve ter pelo menos um ingrediente.";
    } else {
      // Validação de quantidade de ingrediente

      ingredientesSelecionados.forEach((ing, index) => {
        if (!ing.quantidadeUsada || parseFloat(ing.quantidadeUsada) <= 0) {
          newErrors[
            `ingrediente${index}`
          ] = `A quantidade do ingrediente '${ing.nome}' é obrigatória e deve ser maior que zero.`;
        }
      });
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  }, [nome, rendimento, ingredientesSelecionados]);

  const handleSave = async () => {
    setApiError("");

    if (!validate()) {
      return;
    }
    setLoading(true);
    let currentRecipeId = idReceita;

    try {
      const ingredientesParaBackend = ingredientesSelecionados.map((ing) => ({
        ingredienteId: ing.id, // ID do ingrediente em estoque
        quantidadeUsada: parseFloat(ing.quantidadeUsada), // Assegura que é um número
        unidadeMedidaUsada: ing.unidade, // A unidade que o usuário selecionou/digitou
      }));
      const recipeDataToSave = {
        nome,
        rendimento: rendimento, // <--- ENVIANDO RENDIMENTO COMO STRING DIRETAMENTE // O custo_producao é calculado no backend, não precisa enviar
        modoDePreparo: modoPreparo, // Nome da propriedade no backend é 'modoDePreparo'
        ingredientes: ingredientesParaBackend, // <--- ADICIONADO AQUI!
      };

      let recipeResponse;
      if (currentRecipeId) {
        // Se for edição, o backend espera a lista de ingredientes no corpo da requisição PUT
        recipeResponse = await updateRecipe(currentRecipeId, recipeDataToSave);
      } else {
        // Se for criação, o backend espera a lista de ingredientes no corpo da requisição POST
        recipeResponse = await createRecipe(recipeDataToSave);
        if (
          recipeResponse.sucesso &&
          recipeResponse.recipe &&
          recipeResponse.recipe.id
        ) {
          currentRecipeId = recipeResponse.recipe.id;
          setIdReceita(currentRecipeId);
        }
      }

      if (!recipeResponse.sucesso || !currentRecipeId) {
        setApiError(
          recipeResponse.mensagem ||
            recipeResponse.error ||
            "Erro ao salvar receita."
        );
        setLoading(false);
        return;
      }

      const originalIngredientMap = new Map(
        originalIngredientsForEdit.map((ing) => [ing.id, ing])
      );

      const currentIngredientMap = new Map(
        ingredientesSelecionados.map((ing) => [ing.id, ing])
      );

      const operations = []; // Identify ingredients to Add or Update

      for (const [ingId, currentIng] of currentIngredientMap.entries()) {
        const originalIng = originalIngredientMap.get(ingId);
        if (!originalIng) {
          operations.push(
            addIngredientToRecipe(currentRecipeId, {
              ingredienteId: currentIng.id, // ID do ingrediente em estoque
              quantidadeUsada: parseFloat(currentIng.quantidadeUsada),
              unidadeMedidaUsada: currentIng.unidade, // A unidade que o usuário selecionou no modal de ingredientes
            })
          );
        } else if (
          originalIng.quantidadeUsada !== currentIng.quantidadeUsada ||
          originalIng.unidade !== currentIng.unidade
        ) {
          operations.push(
            updateRecipeIngredient(currentRecipeId, currentIng.id, {
              quantidadeUsada: parseFloat(currentIng.quantidadeUsada),

              unidadeMedidaUsada: currentIng.unidade,
            })
          );
        }
      } 

      for (const [ingId, originalIng] of originalIngredientMap.entries()) {
        if (!currentIngredientMap.has(ingId)) {
          operations.push(
            deleteRecipeIngredient(currentRecipeId, originalIng.id)
          );
        }
      } 

      const results = await Promise.all(operations);
      const failedOperations = results.filter((res) => !res.sucesso);

      if (failedOperations.length > 0) {
        const errorMessages = failedOperations
          .map((res) => res.mensagem)
          .join("; ");
        setApiError(`Erro ao sincronizar ingredientes: ${errorMessages}`);
        setLoading(false);
        return;
      }

      onRecipeSaved(currentRecipeId);
      onClose();
    } catch (error) {
      console.error("Erro geral no salvamento da receita:", error);
      setApiError("Erro inesperado ao salvar a receita. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;
  const modalTitle = idReceita ? "Editar Receita" : "Cadastrar Receita";
  const submitButtonText = idReceita ? "ATUALIZAR" : "CADASTRAR";

  return (
    <>
      {" "}
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm bg-opacity-50 flex justify-center items-center z-50">
        {" "}
        <div className="bg-white rounded-2xl p-6 w-[400px] max-h-[95vh] overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">{modalTitle}:</h2>{" "}
          {apiError && (
            <p className="text-red-600 text-sm mb-4 p-2 bg-red-100 rounded border border-red-200">
              {apiError}
            </p>
          )}
          {/* Nome */} <label className="block mb-1 font-semibold">Nome:</label>{" "}
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Insira o nome da receita"
            className={`w-full p-2 border rounded mb-2 focus:outline-none focus:ring-2

   ${
     errors.nome
       ? "border-red-500 focus:ring-red-500"
       : nome
       ? "border-green-600 focus:ring-green-600"
       : "border-gray-300"
   }

  `}
            disabled={loading}
          />{" "}
          {errors.nome && (
            <p className="text-red-500 text-xs mb-2">{errors.nome}</p>
          )}
          {/* Rendimento */}{" "}
          <label className="block mb-1 font-semibold">
            Rendimento (porções):
          </label>{" "}
          <input
            type="number" // Mantido como type="number" para UX, mas o valor é tratado como string
            value={rendimento}
            onChange={(e) => setRendimento(e.target.value)}
            placeholder="ex: 2"
            min={1}
            className={`w-full p-2 border rounded mb-2 focus:outline-none focus:ring-2

   ${
     errors.rendimento
       ? "border-red-500 focus:ring-red-500"
       : rendimento && parseFloat(rendimento) > 0
       ? "border-green-600 focus:ring-green-600"
       : "border-gray-300"
   }

  `}
            disabled={loading}
          />{" "}
          {errors.rendimento && (
            <p className="text-red-500 text-xs mb-2">{errors.rendimento}</p>
          )}
          {/* Ingredientes */}{" "}
          <label className="block mb-1 font-semibold">Ingredientes:</label>{" "}
          <button
            onClick={() => setShowIngredientesModal(true)}
            className={`px-3 py-1 rounded text-sm mb-2

   ${
     ingredientesSelecionados.length > 0
       ? "bg-green-600 hover:bg-green-700"
       : "bg-gray-400"
   }

   text-white

  `}
            disabled={loading}
          >
            EDITAR LISTA ({ingredientesSelecionados.length}){" "}
          </button>{" "}
          {errors.ingredientes && (
            <p className="text-red-500 text-xs mb-2">{errors.ingredientes}</p>
          )}{" "}
          {Object.keys(errors)
            .filter((key) => key.startsWith("ingrediente"))
            .map((key, index) => (
              <p key={index} className="text-red-500 text-xs mb-2">
                {errors[key]}
              </p>
            ))}
          {/* Custo de produção */}{" "}
          <label className="block mb-1 font-semibold">
            Custo de produção (R$):
          </label>{" "}
          <input
            type="text"
            value={custoProducao}
            disabled
            className="w-full p-2 border rounded mb-3 bg-gray-100 border-gray-300"
          />
          {/* Toggle modo de preparo */}{" "}
          <p
            className="underline text-sm cursor-pointer mb-3 text-blue-600 hover:text-blue-800"
            onClick={() => setMostrarModoPreparo(!mostrarModoPreparo)}
          >
            {" "}
            {mostrarModoPreparo
              ? "Ocultar modo de preparo"
              : "Modo de preparo"}{" "}
          </p>
          {/* Modo de preparo */}{" "}
          {mostrarModoPreparo && (
            <textarea
              value={modoPreparo}
              onChange={(e) => setModoPreparo(e.target.value)}
              placeholder="Descreva o modo de preparo da receita (opcional)..."
              className="w-full p-2 border rounded mb-3 bg-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-green-600"
              rows={6}
              disabled={loading}
            />
          )}
          {/* Botões */}{" "}
          <div className="flex justify-between">
            {" "}
            <button
              className="bg-orange-400 text-white px-4 py-2 rounded hover:bg-orange-500"
              onClick={onClose}
              disabled={loading}
            >
              VOLTAR{" "}
            </button>{" "}
            <button
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "SALVANDO..." : submitButtonText}{" "}
            </button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <IngredientSelectorModal
        isOpen={showIngredientesModal}
        onClose={() => setShowIngredientesModal(false)}
        selecionados={ingredientesSelecionados}
        onUpdate={(resultado) => setIngredientesSelecionados(resultado)}
        idReceita={idReceita}
      />{" "}
    </>
  );
}
