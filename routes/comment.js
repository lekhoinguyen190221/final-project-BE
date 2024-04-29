const express = require("express");
const cors = require("cors");
const { connect, disconnect } = require("../database/connect");
const authenticateToken = require("../middleware/auth");

const router = express.Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     comment:
 *       type: object
 *       properties:
 *          restaurantId:
 *             type: number
 *          userId:
 *             type: number
 *          content:
 *             type: string
 *          rate:
 *             type: number
 */

/**
 * @swagger
 * tags:
 *   name: comment
 *   description: The comment managing API
 */

/**
 * @swagger
 * /comment:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get data in comment
 *     tags: [comment]
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
router.get("/", cors(), async (req, res) => {
  try {
    const params = req.query;
    const limit =
      params.limit && !isNaN(params.limit)
        ? params.limit
        : params.limit === "all"
        ? ""
        : 10;
    const page = Number(params.page - 1)
      ? `${Number(params.page - 1) * 10},`
      : "";
    const connection = await connect();
    const [results] = await connection.query(
      `SELECT * FROM comment WHERE content LIKE '%${params.search || ""}%' ${
        limit ? "LIMIT" : ""
      } ${!page ? page : page - 1} ${limit}`
    );
    const [resultsTotal] = await connection.query(
      `SELECT COUNT(*) as count FROM comment WHERE content LIKE '%${
        params.search || ""
      }%' `
    );

    res.status(200).send({
      data: results,
      count: resultsTotal[0].count || 0,
    });
  } catch (error) {
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /comment/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get comment by id
 *     tags: [comment]
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
      `SELECT * FROM comment WHERE id = ?`,
      params.id
    );
    res.status(200).send(results[0]);
  } catch (error) {
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /comment:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Create a new comment
 *     tags: [comment]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/comment'
 *     responses:
 *       500:
 *         description: Some server error
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    const connection = await connect();
    await connection.query(`INSERT INTO comment SET ?`, data);
    res.status(200).send("success");
  } catch (error) {
    res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /comment:
 *   put{id}:
 *     security:
 *       - bearerAuth: []
 *     summary: Update comment
 *     tags: [comment]
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
 *             $ref: '#/components/schemas/comment'
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
      `UPDATE comment SET ${keys.slice(0, -1)} WHERE id = ?`,
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
 * /comment/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete comment
 *     tags: [comment]
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
    const param = req.params;
    const connection = await connect();
    await connection.query(`DELETE FROM comment WHERE id = ?`, param.id);
    res.status(200).send("success");
  } catch (error) {
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

module.exports = router;
