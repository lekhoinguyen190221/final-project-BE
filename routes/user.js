const express = require("express");
const cors = require("cors");
const { connect, disconnect } = require("../database/connect");
const authenticateToken = require("../middleware/auth");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");

const router = express.Router();
const saltRounds = 10;

/**
 * @swagger
 * components:
 *   schemas:
 *     limit:
 *       type: string
 *     sortBy:
 *       type: string
 *       enum: [asc, desc]
 *     page:
 *       type: number
 *     search:
 *       type: string
 *     user:
 *       type: object
 *       properties:
 *          firstName:
 *             type: string
 *          lastName:
 *             type: string
 *          email:
 *             example: example@email.com
 *          phoneNumber:
 *             type: string
 *          password:
 *             type: string
 *          role:
 *             type: string
 *             example: admin
 *     id:
 *       type: number
 *     username:
 *       type: string
 *     password:
 *       type: string
 */

/**
 * @swagger
 * tags:
 *   name: user
 *   description: The user managing API
 */

/**
 * @swagger
 * /user:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get data in user
 *     tags: [user]
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
 *        name: sortBy
 *        schema:
 *          $ref: '#/components/schemas/sortBy'
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
    if (user.role === "admin") {
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
        `SELECT firstName, email, phoneNumber, role, id FROM user WHERE email LIKE '%${
          params.search || ""
        }%' ORDER BY role ${params.sortBy === "desc" ? "DESC" : ""} ${
          limit ? "LIMIT" : ""
        } ${page} ${limit}`
      );
      const [resultsTotal] = await connection.query(
        `SELECT COUNT(*) as count FROM user WHERE email LIKE '%${
          params.search || ""
        }%'`
      );
      res.status(200).send({
        data: results,
        count: resultsTotal[0].count || 0,
      });
    } else {
      return res.status(401).send("Chỉ tài khoản admin mới có quyền truy cập");
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /user/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get user by id
 *     tags: [user]
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
    const jwtData = req.user;
    const user = jwtData.user;
    if (user.role === "admin") {
      const params = req.params;
      const connection = await connect();
      const [results] = await connection.query(
        `SELECT  firstName, email, phoneNumber, role, id FROM user WHERE id = ?`,
        params.id
      );
      res.status(200).send(results[0]);
    } else {
      return res.status(401).send("Chỉ tài khoản admin mới có quyền truy cập");
    }
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /user:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Create a new user
 *     tags: [user]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/user'
 *     responses:
 *       500:
 *         description: Some server error
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const jwtData = req.user;
    const user = jwtData.user;
    if (user.role === "admin") {
      const data = req.body;
      data.password = await bcrypt.hash(data.password, saltRounds);
      const connection = await connect();
      let keys = "";
      let params = "";
      const values = [];
      for (const key of Object.keys(data)) {
        keys += `${String(key)},`;
        params += `?,`;
        values.push(data[String(key)]);
      }
      await connection.query(`INSERT INTO user SET ?`, data);
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
 * /user/{id}:
 *   put:
 *     security:
 *       - bearerAuth: []
 *     summary: Update user
 *     tags: [user]
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
 *             $ref: '#/components/schemas/user'
 *     responses:
 *       500:
 *         description: Some server error
 */
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    const param = req.params;
    if (data.password)
      data.password = await bcrypt.hash(data.password, saltRounds);
    const connection = await connect();
    let keys = "";
    let values = [];
    for (const key of Object.keys(data)) {
      keys += `${String(key)}=?,`;
      values.push(data[String(key)]);
    }
    await connection.query(
      `UPDATE user SET ${keys.slice(0, -1)} WHERE id = ?`,
      [...values, param.id]
    );
    const user = req.user.user;
    if (Number(param.id) === user.id) {
      const [results] = await connection.query(
        `SELECT * FROM user WHERE id = ?`,
        user.id
      );
      const newToken = jwt.sign(
        { user: results[0] },
        process.env.TOKEN_SECRET,
        {
          expiresIn: "7d",
        }
      );
      res.status(200).json({
        newToken,
      });
      return;
    }
    res.status(200).send("success");
  } catch (error) {
    console.log(error);
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /user/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete user
 *     tags: [user]
 *     parameters:
 *      - in: query
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
    if (user.role === "admin") {
      const param = req.params;
      const connection = await connect();
      await connection.query(`DELETE FROM user WHERE id = ?`, param.id);
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
