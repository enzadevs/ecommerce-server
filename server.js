import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import routes from "./routes/routes.js";

dotenv.config();
const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb", extended: true }));
app.use(
  express.urlencoded({ limit: "10mb", extended: true, parameterLimit: 500000 })
);
app.use(bodyParser.json({ limit: "10mb" }));

app.use("/api", routes);

const port = process.env.PORT || 8787;

app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
