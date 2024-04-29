const express = require("express");
const cors = require("cors");
const { connect, disconnect } = require("../database/connect");
const authenticateToken = require("../middleware/auth");
const hanldeSendEmail = require("../plugins/sendEmail");
const getMessage = require("../plugins/message");

const router = express.Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     booking:
 *       type: object
 *       properties:
 *          restaurantId:
 *             type: number
 *          userId:
 *             type: number
 *          date:
 *             type: string
 *             example: 2024-04-17T07:39:04Z
 *          note:
 *             type: string
 */

/**
 * @swagger
 * tags:
 *   name: booking
 *   description: The booking managing API
 */

/**
 * @swagger
 * /booking:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get data in booking
 *     tags: [booking]
 *     parameters:
 *      - in: query
 *        name: restaurantId
 *        schema:
 *          type: number
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
    if (user.role === "user" || user.role === "manager") {
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
        `SELECT booking.*, restaurant.name as restaurantName, user.firstName, user.lastName FROM booking INNER JOIN restaurant ON booking.restaurantId = restaurant.id INNER JOIN user ON booking.userId = user.id WHERE booking.restaurantId = ${
          params.restaurantId || "0"
        } or booking.userId = ${user.id} AND note LIKE '%${params.search || ""}%' ${
          limit ? "LIMIT" : ""
        } ${page} ${limit}`
      );
      const [resultsTotal] = await connection.query(
        `SELECT COUNT(*) as count FROM booking WHERE booking.restaurantId = ${
          params.restaurantId || "0"
        } or booking.userId = ${user.id} AND note LIKE '%${params.search || ""}%' `
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
 * /booking/{id}:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get booking by id
 *     tags: [booking]
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
      `SELECT * FROM booking WHERE id = ?`,
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
 * /booking:
 *   post:
 *     security:
 *       - bearerAuth: []
 *     summary: Create a new booking
 *     tags: [booking]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/booking'
 *     responses:
 *       500:
 *         description: Some server error
 */
router.post("/", authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    const date = new Date();
    data.date = date.toISOString();
    const connection = await connect();
    await connection.query(`INSERT INTO booking SET ?`, data);
    const [userResult] = await connection.query(
      `SELECT * FROM user WHERE id = ?`,
      data.userId
    );
    const [restaurantResult] = await connection.query(
      `SELECT restaurant.name as name, restaurant.email as email, user.firstName as firstName FROM restaurant INNER JOIN user ON user.id = restaurant.userId WHERE restaurant.id = ?`,
      data.restaurantId
    );
    const str = data.note.split(",");
    if (str.length) {
      hanldeSendEmail(
        userResult[0].email,
        getMessage().customerBooking(
          `${userResult[0].firstName || ""} ${userResult[0].lastName || ""}`,
          restaurantResult[0].name,
          str[0].replace("Ngày: ", ""),
          str[1].replace("Thời gian đặt: ", ""),
          str[2].replace("số người: ", "")
        ),
        res,
        "Chúng tôi đã gửi email đến bạn, vui lòng xác nhận"
      );
    }
    if (restaurantResult[0].email) {
      hanldeSendEmail(
        restaurantResult[0].email,
        getMessage().managerBooking(
          restaurantResult[0].firstName || "",
          restaurantResult[0].name,
          str[0].replace("Ngày: ", ""),
          str[1].replace("Thời gian đặt: ", ""),
          str[2].replace("số người: ", "")
        ),
        res,
        "Chúng tôi đã gửi email đến bạn, vui lòng xác nhận"
      );
    }
    res.status(200).send("success");
  } catch (error) {
    res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /booking:
 *   put{id}:
 *     security:
 *       - bearerAuth: []
 *     summary: Update booking
 *     tags: [booking]
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
 *             $ref: '#/components/schemas/booking'
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
      `UPDATE booking SET ${keys.slice(0, -1)} WHERE id = ?`,
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
 * /booking/{id}:
 *   delete:
 *     security:
 *       - bearerAuth: []
 *     summary: Delete booking
 *     tags: [booking]
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
      await connection.query(`DELETE FROM booking WHERE id = ?`, param.id);
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
