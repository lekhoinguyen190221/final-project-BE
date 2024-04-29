const express = require("express");
const cors = require("cors");
const { connect, disconnect } = require("../database/connect");
const authenticateToken = require("../middleware/auth");

const router = express.Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     contributeIdeas:
 *       type: object
 *       properties:
 *          restaurantId:
 *             type: number
 *          userId:
 *             type: number
 *          comment:
 *             type: string
 */

/**
 * @swagger
 * tags:
 *   name: contributeIdeas
 *   description: The contributeIdeas managing API
 */

/**
 * @swagger
 * /contributeIdeas:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get data in contributeIdeas
 *     tags: [contributeIdeas]
 *     parameters:
 *      - in: query
 *        name: limit
 *        schema:
 *          $ref: '#/components/schemas/limit'
 *      - in: query
 *        name: page
 *        schema:
 *          $ref: '#/components/schemas/page'
 *      - in: query
 *        name: search
 *        schema:
 *          $ref: '#/components/schemas/search'
 *     responses:
 *        200:
 *          description: The list of the data
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                example: []
 *        500:
 *          description: Some server error
 */
router.get("/", authenticateToken, async (req, res) => {
  try {
    const jwtData = req.user;
    const user = jwtData.user;
    if (user.role === "manager") {
      const params = req.query;
      const limit =
        params.limit && !isNaN(params.limit)
          ? params.limit
          : params.limit === "all"
          ? ""
          : 10;
      const page = params.page - 1 ? `${Number(params.page - 1) * 10},` : "";
      const connection = await connect();
      const [results] = await connection.query(
        `SELECT contributeIdeas.*, user.firstName, user.lastName, user.email, user.phoneNumber, restaurant.name AS restaurantName FROM contributeIdeas INNER JOIN user ON user.id = contributeIdeas.userId INNER JOIN restaurant ON restaurant.id = contributeIdeas.restaurantId WHERE restaurant.userId = ${
          user.id
        } AND comment LIKE '%${params.search || ""}%' ${
          limit ? "LIMIT" : ""
        } ${page} ${limit}`
      );
      const [resultsTotal] = await connection.query(
        `SELECT COUNT(*) as count FROM contributeIdeas INNER JOIN restaurant ON restaurant.id = contributeIdeas.restaurantId WHERE restaurant.userId = ${
          user.id
        } AND comment LIKE '%${params.search || ""}%' `
      );

      res.status(200).send({
        data: results,
        count: resultsTotal[0].count || 0,
      });
    } else {
      return res.status(401).send("Chỉ tài khoản admin mới có quyền truy cập");
    }
  } catch (error) {
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /contributeIdeas/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get contributeIdeas by id
 *     tags: [contributeIdeas]
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          $ref: '#/components/schemas/id'
 *     responses:
 *        200:
 *          description: The list of the data
 *          content:
 *            application/json:
 *              schema:
 *                type: array
 *                example: []
 *        500:
 *          description: Some server error
 */
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const params = req.params;
    const connection = await connect();
    const [results] = await connection.query(
      `SELECT * FROM contributeIdeas WHERE id = ?`,
      params.id
    );
    res.status(200).send(results[0] || {});
  } catch (error) {
    return res.status(500).send({ message: "Đã có lỗi xảy ra" });
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /contributeIdeas:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Create a new contributeIdeas
 *     tags: [contributeIdeas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/contributeIdeas'
 *     responses:
 *       500:
 *         description: Some server error
 */
router.post("/", cors(), async (req, res) => {
  try {
    const data = req.body;
    const connection = await connect();
    await connection.query(`INSERT INTO contributeIdeas SET ?`, data);
    res.status(200).send("success");
  } catch (error) {
    console.log(error);
    return res.status(500).send({ message: "Đã có lỗi xảy ra" });
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /contributeIdeas:
 *   put{id}:
 *     security:
 *       - bearerAuth: []
 *     summary: Update contributeIdeas
 *     tags: [contributeIdeas]
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          $ref: '#/components/schemas/id'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/contributeIdeas'
 *     responses:
 *       500:
 *         description: Some server error
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    const param = req.params;
    const connection = await connect();
    let keys = "";
    let values = [];
    for (const key of Object.keys(data)) {
      keys += `${String(key)}=?,`;
      values.push(data[String(key)]);
    }
    await connection.query(
      `UPDATE contributeIdeas SET ${keys.slice(0, -1)} WHERE id = ?`,
      [...values, param.id]
    );
    res.status(200).send("success");
  } catch (error) {
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /contributeIdeas/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete contributeIdeas
 *     tags: [contributeIdeas]
 *     parameters:
 *      - in: path
 *        name: id
 *        schema:
 *          $ref: '#/components/schemas/id'
 *     responses:
 *       500:
 *         description: Some server error
 */
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const jwtData = req.user;
    const user = jwtData.user;
    if (user.role === "manager") {
      const param = req.params;
      const connection = await connect();
      await connection.query(
        `DELETE FROM contributeIdeas WHERE id = ?`,
        param.id
      );
      res.status(200).send("success");
    } else {
      return res
        .status(401)
        .send("Chỉ tài khoản manager mới có quyền truy cập");
    }
  } catch (error) {
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

module.exports = router;
