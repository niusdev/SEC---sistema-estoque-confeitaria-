const express = require("express");
const OrderController = require("../controllers/OrderController");
const checkToken = require("../controllers/middlewares/checkToken");

const router = express.Router();

router.post("/pedidos", checkToken, OrderController.createOrder);

router.get("/pedidos", checkToken, OrderController.getOrders);

router.get("/pedidos/:id", checkToken, OrderController.getOrderById);

router.put(
  "/pedidos/:id/receita/:receitaId/quantidade",
  checkToken,
  OrderController.updateOrder
);

router.put(
  "/super/pedidos/:id/status",
  checkToken,
  OrderController.updateOrderStatus
);

router.delete("/pedidos/:id", checkToken, OrderController.deleteOrder);

router.delete(
  "/pedidos/:id/receita/:receitaId",
  checkToken,
  OrderController.removeRecipeFromOrder
);

module.exports = router;
