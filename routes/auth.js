const express = require("express");
var cors = require("cors");
const { connect, disconnect } = require("../database/connect");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const process = require("node:process");
const hanldeSendEmail = require("../plugins/sendEmail");
const authenticateToken = require("../middleware/auth");
const crypto = require("crypto");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook");
const getMessage = require("../plugins/message");
const bcrypt = require("bcrypt");

const saltRounds = 10;
const router = express.Router();
const upload = multer({ type: "", email: "", password: "", phoneNumber: "" });
const generateAccessToken = (data) => {
  return jwt.sign(data, process.env.TOKEN_SECRET, { expiresIn: "7d" });
};

let tokenClient = "";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const data = profile._json;
        const connection = await connect();
        const [results] = await connection.query(
          `SELECT * FROM user WHERE email=?`,
          data.email
        );
        if (!results.length) {
          const dataInsert = {
            email: data.email,
            firstName: data.given_name,
            lastName: data.family_name,
            password: "123456a@A", // Mật khẩu mặc định của hệ thống
            isVerified: 1,
            role: "user",
          };
          await connection.query(`INSERT INTO user SET ?`, dataInsert);
          tokenClient = generateAccessToken({ user: dataInsert });
        }
        if (results.length) {
          await connection.query(
            `UPDATE user SET isVerified = 1 WHERE email = ?`,
            data.email
          );
          tokenClient = generateAccessToken({ user: results[0] });
        }
      } catch (error) {
        tokenClient = "";
      } finally {
        disconnect();
        return done(null, profile);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_URI,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const data = profile._json;
        const connection = await connect();
        const [results] = await connection.query(
          `SELECT * FROM user WHERE facebookId=?`,
          data.id
        );
        if (!results.length) {
          const dataInsert = {
            email: "",
            firstName: data.displayName,
            lastName: "",
            password: "123456a@A",
            isVerified: 1,
            facebookId: data.id,
            role: "user",
          };
          await connection.query(`INSERT INTO user SET ?`, dataInsert);
          tokenClient = generateAccessToken({ user: dataInsert });
        }
        if (results.length && results[0].isVerified) {
          tokenClient = generateAccessToken({ user: results[0] });
        }
      } catch (error) {
        tokenClient = "";
      } finally {
        disconnect();
        return done(null, profile);
      }
    }
  )
);

passport.serializeUser(function (user, cb) {
  process.nextTick(function () {
    cb(null, { id: user.id, username: user.username, name: user.name });
  });
});

passport.deserializeUser(function (user, cb) {
  process.nextTick(function () {
    return cb(null, user);
  });
});
/**
 * @swagger
 * components:
 *   schemas:
 *     type:
 *       type: string
 *       enum: [withEmail, withPhone]
 *       example: withEmail
 *     email:
 *       type: string
 *       format: email
 *     firstName:
 *       type: string
 *     lastName:
 *       type: string
 *     phoneNumber:
 *       type: string
 *     password:
 *       type: string
 *     token:
 *       type: string
 */

/**
 * @swagger
 * tags:
 *   name: auth
 *   description: The auth managing API
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 $ref: '#/components/schemas/firstName'
 *               lastName:
 *                 $ref: '#/components/schemas/lastName'
 *               email:
 *                 $ref: '#/components/schemas/email'
 *               phoneNumber:
 *                 $ref: '#/components/schemas/phoneNumber'
 *               password:
 *                 $ref: '#/components/schemas/password'
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
router.post("/register", cors(), async (req, res) => {
  try {
    const data = req.body;
    const connection = await connect();
    const [results] = await connection.query(
      `SELECT * FROM user WHERE email=?`,
      data.email
    );
    if (!results.length) {
      data.role = "user";
      data.password = await bcrypt.hash(data.password, saltRounds);
      let keys = "";
      let params = "";
      const values = [];
      for (const key of Object.keys(data)) {
        keys += `${String(key)},`;
        params += `?,`;
        values.push(data[String(key)]);
      }
      await connection.query(`INSERT INTO user SET ?`, data);
      const token = crypto.randomBytes(20).toString("hex");
      const tokenData = {
        email: data.email,
        token: token,
        type: "register",
      };
      await connection.query(`INSERT INTO token SET ?`, tokenData);
      const contentEmail = getMessage().register(data.email, token);
      hanldeSendEmail(
        data.email,
        contentEmail,
        res,
        "Chúng tôi đã gửi email đến bạn, vui lòng xác nhận"
      );
    } else {
      res.status(409).json({ message: "Email đã được sử dụng" });
    }
  } catch (error) {
    res.status(500).send(error);
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /auth/verifiedUser:
 *   post:
 *     summary: Login
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 $ref: '#/components/schemas/email'
 *               token:
 *                 $ref: '#/components/schemas/token'
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
router.post("/verifiedUser", upload.none(), async (req, res) => {
  try {
    const data = req.body;
    const connection = await connect();
    const [results] = await connection.query(
      `SELECT * FROM token WHERE email = ? and token = ? and type = 'register`,
      [data.email, data.token]
    );

    if (!results.length)
      res
        .status(409)
        .json({ message: "Vui lòng kiểm tra lại token và email của bạn" });
    else {
      const [checkResults] = await connection.query(
        `SELECT * FROM user WHERE email = ? and isVerified = 1`,
        data.email
      );
      if (checkResults.length) {
        res.status(409).send("Tài khoản đã được xác minh");
        await connection.query(
          `DELETE FROM token WHERE email = ? and token = ?`,
          [data.email, data.token]
        );
      } else {
        await connection.query(
          `UPDATE user SET isVerified = 1 WHERE email = ?`,
          data.email
        );
        await connection.query(`DELETE FROM token WHERE email = ?`, data.email);
        res.status(200).send("Xác nhận tài khoản thành công");
      }
    }
  } catch (error) {
    res.status(500).json({ message: "Đã có lỗi xảy ra" });
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /auth/forgotPassword:
 *   post:
 *     summary: Forgot password
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 $ref: '#/components/schemas/email'
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
router.post("/forgotPassword", upload.none(), async (req, res) => {
  try {
    const data = req.body;
    const connection = await connect();
    const token = crypto.randomBytes(20).toString("hex");
    const tokenData = {
      email: data.email,
      token: token,
      type: "forgot",
    };
    await connection.query(`INSERT INTO token SET ?`, tokenData);
    const contentEmail = getMessage().changePassword(data.email, token);
    hanldeSendEmail(
      data.email,
      contentEmail,
      res,
      "Chúng tôi đã gửi email đến bạn, vui lòng xác nhận"
    );
  } catch (error) {
    res.status(500).json({ message: "Đã có lỗi xảy ra" });
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /auth/resetPassword:
 *   post:
 *     summary: Login
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 $ref: '#/components/schemas/email'
 *               token:
 *                 $ref: '#/components/schemas/token'
 *               password:
 *                 $ref: '#/components/schemas/password'
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
router.post("/resetPassword", upload.none(), async (req, res) => {
  try {
    const data = req.body;
    const connection = await connect();
    const [results] = await connection.query(
      `SELECT * FROM user WHERE email = ?`,
      [data.email, data.token]
    );

    if (!results.length)
      res.status(409).json({
        message: "Tài khoản chứa email bạn vừa nhập không tồn tại",
      });
    else {
      const [checkResults] = await connection.query(
        `SELECT * FROM token WHERE email = ? and token = ? and type = 'forgot'`,
        [data.email, data.token]
      );
      if (checkResults.length) {
        data.password = await bcrypt.hash(data.password, saltRounds);
        await connection.query(`UPDATE user SET password = ? WHERE email = ?`, [
          data.password,
          data.email,
        ]);
        await connection.query(
          `DELETE FROM token WHERE email = ? and token = ?`,
          [data.email, data.token]
        );
        res.status(200).send("Đổi mật khẩu thành công");
      } else {
        res.status(409).json({
          message: "Hãy kiểm tra lại token của bạn",
        });
      }
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Đã có lỗi xảy ra" });
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login
 *     tags: [auth]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 $ref: '#/components/schemas/email'
 *               password:
 *                 $ref: '#/components/schemas/password'
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
router.post("/login", upload.none(), async (req, res) => {
  try {
    const data = req.body;
    const connection = await connect();
    const [results] = await connection.query(
      `SELECT * FROM user WHERE email = ?`,
      data.email
    );
    if (results.length) {
      const checkLogin = await bcrypt.compareSync(
        data.password,
        results[0].password
      );
      if (!checkLogin)
        res.status(500).json({ message: "Sai tên tài khoản hoặc mật khẩu" });
      else {
        delete results[0].password;
        const token = generateAccessToken({ user: results[0] });
        res.status(200).send({ token });
      }
    } else {
      res.status(500).json({ message: "Sai tên tài khoản hoặc mật khẩu" });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Đã có lỗi xảy ra" });
  } finally {
    disconnect();
  }
});

/**
 * @swagger
 * /auth/getMe:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get user me
 *     tags: [auth]
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
router.get("/getMe", authenticateToken, async (req, res) => {
  try {
    const jwtData = req.user;
    const user = jwtData.user;
    res.status(200).send(user);
  } catch (error) {
    return res.status(500).send(error);
  }
});

/**
 * @swagger
 * /auth/withGoogle:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get user me
 *     tags: [auth]
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

router.get(
  "/withGoogle",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

/**
 * @swagger
 * /auth/withFacebook:
 *   get:
 *     security:
 *       - bearerAuth: []
 *     summary: Get user me
 *     tags: [auth]
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

router.get("/withFacebook", passport.authenticate("facebook"));

router.get(
  "/withGoogle/callback",
  passport.authenticate("google", {
    session: false,
    failureRedirect: `http://localhost:3000/login-success?token=`,
  }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect(`http://localhost:3000/login-success?token=${tokenClient}`);
  }
);

router.get(
  "/withFacebook/callback",
  passport.authenticate("facebook", {
    session: false,
    failureRedirect: `http://localhost:3000/login-success?token=`,
  }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect(`http://localhost:3000/login-success?token=${tokenClient}`);
  }
);

module.exports = router;
