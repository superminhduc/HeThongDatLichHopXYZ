const express = require("express");
const employeeController = require("../controllers/employeeController");

const router = express.Router();

router.get("/", employeeController.index);

router.get("/create", employeeController.showCreateForm);
router.post("/create", employeeController.create);

router.get("/edit/:id", employeeController.showEditForm);
router.post("/edit/:id", employeeController.update);

router.post("/delete/:id", employeeController.delete);

module.exports = router;