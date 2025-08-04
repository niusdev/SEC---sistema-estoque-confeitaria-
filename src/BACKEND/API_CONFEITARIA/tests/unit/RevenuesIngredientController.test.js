const request = require("supertest");
const jwt = require("jsonwebtoken");
const { PrismaClient, UnidadeMedida } = require("@prisma/client");
const prisma = new PrismaClient();
const app = require("../../app");
const { v4: uuidv4 } = require("uuid");

const secretKey = process.env.SECRET_KEY;

describe("ReceitaIngredienteController", () => {
  let token;
  let user;
  let receitaId;
  let ingredienteId;
  let receitaIngredienteId;

  beforeAll(async () => {
    await prisma.tbUsuario.deleteMany({ where: { email: "teste@teste.com" } });
    user = await prisma.tbUsuario.create({
      data: {
        id: uuidv4(),
        nome: "Usuário Teste",
        email: "teste@teste.com",
        senha: "12345678",
        telefone: "(88) 9 9999-9999",
        perfil: "SUPERVISOR_SENIOR",
      },
    });

    token =
      "Bearer " + jwt.sign({ id: user.id }, secretKey, { expiresIn: 1200 });

    const ingrediente = await prisma.tbIngredienteEmEstoque.create({
      data: {
        id: uuidv4(),
        nome: "óleo de coco",
        unidades: 40,
        pesoPorUnidade: 1,
        unidadeMedida: UnidadeMedida.l,
        validade: "2027-03-15",
        nivelMinimo: 3,
        precoCusto: 12.0,
        categoria: "Óleos e Gorduras",
      },
    });
    ingredienteId = ingrediente.id;

    const receita = await prisma.tbReceita.create({
      data: {
        id: uuidv4(),
        nome: "Bolo Teste",
        rendimento: "10 porções",
        custoDeProducao: 0,
      },
    });
    receitaId = receita.id;
  });

  afterAll(async () => {
    if (receitaIngredienteId) {
      await prisma.tbReceitaIngrediente
        .delete({ where: { id: receitaIngredienteId } })
        .catch(() => {});
    }
    if (receitaId) {
      await prisma.tbReceita
        .delete({ where: { id: receitaId } })
        .catch(() => {});
    }
    if (ingredienteId) {
      await prisma.tbIngredienteEmEstoque
        .delete({ where: { id: ingredienteId } })
        .catch(() => {});
    }
    if (user?.id) {
      await prisma.tbUsuario.delete({ where: { id: user.id } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  describe("POST /super/receitas/:idReceita/ingredientes", () => {
    test("Adiciona ingrediente na receita com quantidade válida", async () => {
      const res = await request(app)
        .post(`/api_confeitaria/super/receitas/${receitaId}/ingredientes`)
        .set("Authorization", token)
        .send({
          idIngrediente: ingredienteId,
          quantidadeUsada: 1.5,
          unidadeMedidaUsada: UnidadeMedida.l,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty(
        "message",
        "Ingrediente adicionado à receita com sucesso!"
      );
      expect(res.body.novoIngrediente).toHaveProperty("idReceita", receitaId);
      receitaIngredienteId = res.body.novoIngrediente.id;
    });

    test("Falha ao adicionar ingrediente com quantidade negativa", async () => {
      const res = await request(app)
        .post(`/api_confeitaria/super/receitas/${receitaId}/ingredientes`)
        .set("Authorization", token)
        .send({
          idIngrediente: ingredienteId,
          quantidadeUsada: -1,
          unidadeMedidaUsada: UnidadeMedida.l,
        });

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty("error");
    });

    test("Falha ao adicionar ingrediente já vinculado", async () => {
      const res = await request(app)
        .post(`/api_confeitaria/super/receitas/${receitaId}/ingredientes`)
        .set("Authorization", token)
        .send({
          idIngrediente: ingredienteId,
          quantidadeUsada: 0.5,
          unidadeMedidaUsada: UnidadeMedida.l,
        });

      expect(res.statusCode).toBe(409);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("PUT /super/receitas/:idReceita/ingredientes/:idIngrediente", () => {
    test("Atualiza quantidade do ingrediente na receita", async () => {
      const res = await request(app)
        .put(
          `/api_confeitaria/super/receitas/${receitaId}/ingredientes/${ingredienteId}`
        )
        .set("Authorization", token)
        .send({
          quantidadeUsada: 2,
          unidadeMedidaUsada: UnidadeMedida.l,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty(
        "message",
        "Ingrediente atualizado com sucesso!"
      );
      expect(res.body.ingredienteAtualizado).toHaveProperty("qtdGramasOuMl");
    });

    test("Falha ao atualizar ingrediente inexistente", async () => {
      const res = await request(app)
        .put(
          `/api_confeitaria/super/receitas/${receitaId}/ingredientes/uuid-inexistente-0000`
        )
        .set("Authorization", token)
        .send({
          quantidadeUsada: 1,
          unidadeMedidaUsada: UnidadeMedida.l,
        });

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("error");
    });
  });

  describe("DELETE /super/receitas/:idReceita/ingredientes/:idIngrediente", () => {
    let ingredienteAInserirId;

    beforeEach(async () => {
      ingredienteAInserirId = uuidv4();
      await prisma.tbIngredienteEmEstoque.create({
        data: {
          id: ingredienteAInserirId,

          nome: `ingrediente-para-delete-${Date.now()}`,
          unidades: 1,
          pesoPorUnidade: 1000,
          unidadeMedida: UnidadeMedida.g,
          validade: "2027-03-15",
          nivelMinimo: 1,
          precoCusto: 5.0,
          categoria: "Teste",
        },
      });

      await prisma.tbReceitaIngrediente.create({
        data: {
          idReceita: receitaId,
          idIngrediente: ingredienteAInserirId,
          qtdGramasOuMl: 100,
        },
      });
    });

    afterEach(async () => {
      await prisma.tbReceitaIngrediente.deleteMany({
        where: { idReceita: receitaId, idIngrediente: ingredienteAInserirId },
      });

      await prisma.tbIngredienteEmEstoque.delete({
        where: { id: ingredienteAInserirId },
      });
    });

    test("Remove ingrediente da receita com sucesso", async () => {
      const res = await request(app)
        .delete(
          `/api_confeitaria/super/receitas/${receitaId}/ingredientes/${ingredienteAInserirId}`
        )
        .set("Authorization", token);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty(
        "message",
        "Ingrediente removido da receita com sucesso!"
      );
    });

    test("Falha ao remover ingrediente inexistente", async () => {
      const res = await request(app)
        .delete(
          `/api_confeitaria/super/receitas/${receitaId}/ingredientes/uuid-inexistente-0000`
        )
        .set("Authorization", token);

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty("error");
    });
  });
});
