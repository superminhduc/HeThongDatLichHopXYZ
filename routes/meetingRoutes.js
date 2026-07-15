const express = require("express");
const meetingController = require("../controllers/meetingController");

const router = express.Router();

router.get("/", meetingController.index);

router.get("/create", meetingController.showCreateForm);
router.post("/create", meetingController.create);

// Trang lịch
router.get("/calendar", meetingController.calendar);
router.get("/calendar/events", meetingController.getCalendarEvents);

// Sửa cuộc họp
router.get("/:id/edit", meetingController.showEditForm);
router.post("/:id/edit", meetingController.update);

// Xem chi tiết
router.get("/:id", meetingController.detail);

// Trạng thái
router.post("/:id/complete", meetingController.complete);
router.post("/:id/cancel", meetingController.cancel);

module.exports = router;