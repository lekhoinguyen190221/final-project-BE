const express = require("express");
const cors = require("cors");
const { connect, disconnect } = require("../database/connect");
const authenticateToken = require("../middleware/auth");
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: userCheck
 *   description: The booking managing API
 */

/**
 * @swagger
 * /userCheck/checkBooking:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get booking by user and restaurant
 *     tags: [userCheck]
 *     parameters:
 *      - in: query
 *        name: userId
 *        schema:
 *          type: number
 *      - in: query
 *        name: restaurantId
 *        schema:
 *          type: number
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
router.get("/checkBooking", cors(), async (req, res) => {
  try {
    const params = req.query;
    const connection = await connect();
    const [results] = await connection.query(
      `SELECT * FROM booking WHERE userId = ? AND restaurantId = ?`,
      [Number(params.userId), Number(params.restaurantId)]
    );
    if (results.length) {
      res.status(200).send({ isBooking: true });
    } else {
      res.status(409).send({ isBooking: false });
    }
  } catch (error) {
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /userCheck/restaurant:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get data in restaurant
 *     tags: [userCheck]
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
router.get("/restaurant", authenticateToken, async (req, res) => {
  try {
    const jwtData = req.user;
    const user = jwtData.user;
    if (user.role === "admin" || user.role === "manager") {
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
        `SELECT restaurant.*, (SELECT SUM(comment.rate) FROM comment WHERE restaurant.id = comment.restaurantId) as rateTotal FROM restaurant WHERE name LIKE '%${
          params.search || ""
        }%' ${user.role === "manager" ? ` AND userId = ${user.id} ` : " "} ${
          limit ? "LIMIT" : ""
        } ${page} ${limit}`
      );
      const [resultsTotal] = await connection.query(
        `SELECT COUNT(*) as count FROM restaurant WHERE name LIKE '%${
          params.search || ""
        }%' ${user.role === "manager" ? `AND userId = ${user.id}` : ""} `
      );
      res.status(200).send({
        data: resultsTotal[0].count ? results : [],
        count: resultsTotal[0].count || 0,
      });
    } else {
      res.status(409).send({ message: "Tài khoản không có " });
    }
  } catch (error) {
    return res.status(500).send(error);
  } finally {
    disconnect();
  }
});

module.exports = router;
