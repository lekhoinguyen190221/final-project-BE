const express = require("express");
const cors = require("cors");
const { connect, disconnect } = require("../database/connect");
const authenticateToken = require("../middleware/auth");

const router = express.Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     restaurant:
 *       type: object
 *       properties:
 *          name:
 *             type: string
 *          address:
 *             type: string
 *          manager:
 *             type: string
 *          phoneNumber:
 *             type: string
 *          email:
 *             type: string
 *          description:
 *             type: string
 *          menu:
 *             type: string
 *          website:
 *             type: string
 *          workingTime:
 *             type: string
 *          gallery:
 *             type: string
 *          latitude:
 *             type: number
 *             example: 21.028511
 *          longitude:
 *             type: number
 *             example: 105.804817
 *          rules:
 *             type: string
 *          tags:
 *             type: string
 *          facilities:
 *             type: string
 *          emptyTable:
 *             type: string
 *          price:
 *             type: string
 *          userId:
 *             type: number
 *          provinceId:
 *             type: number
 */

/**
 * @swagger
 * tags:
 *   name: restaurant
 *   description: The restaurant managing API
 */

/**
 * @swagger
 * /restaurant:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get data in restaurant
 *     tags: [restaurant]
 *     parameters:
 *      - in: query
 *        name: provinceId
 *        schema:
 *          type: number
 *      - in: query
 *        name: workingTime
 *        schema:
 *          type: string
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
router.get("/", cors(), async (req, res) => {
  try {
    const params = req.query;
    const connection = await connect();
    const [results] = await connection.query(
      `SELECT restaurant.*, (SELECT AVG(comment.rate) FROM comment WHERE restaurant.id = comment.restaurantId) as rateTotal, (SELECT COUNT(id) FROM comment WHERE restaurant.id = comment.restaurantId) as rateCount FROM restaurant WHERE name LIKE '%${
        params.search || ""
      }%' ${
        params.provinceId ? ` AND provinceId = ${params.provinceId}` : ""
      } ${
        params.workingTime
          ? `AND workingTime LIKE '%${params.workingTime}%'`
          : ""
      }`
    );
    res.status(200).send({
      data: results,
    });
  } catch (error) {
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /restaurant/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get restaurant by id
 *     tags: [restaurant]
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
router.get("/:id", cors(), async (req, res) => {
  try {
    const params = req.params;
    const connection = await connect();
    const [results] = await connection.query(
      `SELECT restaurant.*, (SELECT SUM(comment.rate) FROM comment WHERE restaurant.id = comment.restaurantId) as rateTotal, (SELECT COUNT(id) FROM comment WHERE restaurant.id = comment.restaurantId) as rateCount FROM restaurant WHERE id = ?`,
      params.id
    );
    const data = results[0];
    const [commentResults] = await connection.query(
      `SELECT comment.*, user.lastName, user.firstName FROM comment INNER JOIN user ON user.id = comment.userId WHERE restaurantId = ?`,
      data.id
    );
    data.comments = commentResults;
    res.status(200).send(data);
  } catch (error) {
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /restaurant:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Create a new restaurant
 *     tags: [restaurant]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/restaurant'
 *     responses:
 *       500:
 *         description: Some server error
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const jwtData = req.user;
    const user = jwtData.user;
    if (user.role === "admin" || user.role === "manager") {
      const data = req.body;
      const connection = await connect();
      await connection.query(`INSERT INTO restaurant SET ?`, data);
      res.status(200).send("success");
    } else {
      return res.status(401).send("Chỉ tài khoản admin mới có quyền truy cập");
    }
  } catch (error) {
    res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /restaurant:
 *   put{id}:
 *     security:
 *       - bearerAuth: []
 *     summary: Update restaurant
 *     tags: [restaurant]
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
 *             $ref: '#/components/schemas/restaurant'
 *     responses:
 *       500:
 *         description: Some server error
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const jwtData = req.user;
    const user = jwtData.user;
    if (user.role === "admin" || user.role === "manager") {
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
        `UPDATE restaurant SET ${keys.slice(0, -1)} WHERE id = ?`,
        [...values, param.id]
      );
      res.status(200).send("success");
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
 * /restaurant/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete restaurant
 *     tags: [restaurant]
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
    if (user.role === "admin" || user.role === "manager") {
      const param = req.params;
      const connection = await connect();
      connection.query(`DELETE FROM restaurant WHERE id = ?`, Number(param.id));
      res.status(200).send("success");
    } else {
      return res.status(401).send("Chỉ tài khoản admin mới có quyền truy cập");
    }
  } catch (error) {
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

module.exports = router;
