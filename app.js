const express = require("express");
const logger = require("morgan");
const swaggerUI = require("swagger-ui-express");
const swaggerJsDoc = require("swagger-jsdoc");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const authRouter = require("./routes/auth");
const indexRouter = require("./routes/index");
const usersRouter = require("./routes/user");
const restaurantRouter = require("./routes/restaurant");
const bookingRouter = require("./routes/booking");
const commentRouter = require("./routes/comment");
const contributeIdeasRouter = require("./routes/contributeIdeas");
const fileRouter = require("./routes/file");
const userCheckRouter = require("./routes/userCheck");
const passport = require("passport");
const path = require("path");
const port = process.env.PORT || 3000;

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use("/static", express.static(path.join(__dirname, "uploads")));
const options = {
  definition: {
    openapi: "3.0.0",
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    info: {
      title: "Library API",
      version: "1.0.0",
      description: "A simple Express Library API",
    },
    servers: [
      {
        url: `http://localhost:${port}`,
      },
      {
        url: `https://c222-171-229-238-113.ngrok-free.app`,
      },
    ],
  },
  apis: ["./routes/*.js"],
};
const specs = swaggerJsDoc(options);

app.use(
  cors({
    origin: "*",
    methods: ["POST", "GET", "PUT", "DELETE"],
  })
);

app.use("/", indexRouter);
app.use("/auth", authRouter);
app.use("/user", usersRouter);
app.use("/restaurant", restaurantRouter);
app.use("/booking", bookingRouter);
app.use("/comment", commentRouter);
app.use("/contributeIdeas", contributeIdeasRouter);
app.use("/userCheck", userCheckRouter);
app.use("/file", fileRouter);

app.use(logger("dev"));
app.use("/api-docs", swaggerUI.serve, swaggerUI.setup(specs));

app.listen(port, () => {
  console.log(`App listening on port: http://localhost:${port}`);
  console.log(`Swagger listening on port: http://localhost:${port}/api-docs`);
});
