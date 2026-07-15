const Meeting = require("../models/meetingModel");
const db = require("../config/db");

function getEmployees(callback) {
    db.query(
        `
        SELECT *
        FROM employees
        WHERE status = 'active'
        ORDER BY full_name
        `,
        callback
    );
}

function normalizeParticipants(participants) {
    if (!participants) {
        return [];
    }

    return Array.isArray(participants)
        ? participants
        : [participants];
}

function validateMeeting(data) {
    if (
        !data.title ||
        !data.meeting_date ||
        !data.start_time ||
        !data.end_time ||
        !data.location ||
        !data.organizer_id
    ) {
        return "Vui lòng nhập đầy đủ thông tin bắt buộc.";
    }

    if (data.end_time <= data.start_time) {
        return "Giờ kết thúc phải lớn hơn giờ bắt đầu.";
    }

    return "";
}

exports.index = (req, res) => {
    Meeting.getAll((err, meetings) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Không thể lấy danh sách cuộc họp");
        }

        res.render("meetings", {
            meetings,
            message: req.query.message || ""
        });
    });
};

exports.showCreateForm = (req, res) => {
    getEmployees((err, employees) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Không thể lấy danh sách nhân viên");
        }

        res.render("meeting-create", {
            employees,
            error: "",
            formData: {}
        });
    });
};

exports.create = (req, res) => {
    const data = req.body;
    const error = validateMeeting(data);
    const participants = normalizeParticipants(data.participants);

    const employeeIds = [
        Number(data.organizer_id),
        ...participants.map(Number)
    ];

    const uniqueEmployeeIds = [...new Set(employeeIds)];

    if (error) {
        return getEmployees((err, employees) => {
            if (err) {
                return res.status(500).send("Không thể lấy danh sách nhân viên");
            }

            res.render("meeting-create", {
                employees,
                error,
                formData: data
            });
        });
    }

    if (participants.length === 0) {
        return getEmployees((err, employees) => {
            if (err) {
                return res.status(500).send("Không thể lấy danh sách nhân viên");
            }

            res.render("meeting-create", {
                employees,
                error: "Vui lòng chọn ít nhất một người tham gia.",
                formData: data
            });
        });
    }

    Meeting.checkEmployeeConflict(
    data.meeting_date,
    data.start_time,
    data.end_time,
    uniqueEmployeeIds,
    (conflictError, conflicts) => {
        if (conflictError) {
            console.error(conflictError);

            return res.status(500).send(
                "Không thể kiểm tra lịch của nhân viên"
            );
        }

        if (conflicts.length > 0) {
            const conflictNames = [
                ...new Set(
                    conflicts.map(item => item.full_name)
                )
            ].join(", ");

            return getEmployees((employeeError, employees) => {
                if (employeeError) {
                    return res.status(500).send(
                        "Không thể lấy danh sách nhân viên"
                    );
                }

                return res.render("meeting-create", {
                    employees,
                    formData: data,
                    error:
                        `Nhân viên ${conflictNames} đã có lịch họp ` +
                        `trùng với khoảng thời gian này.`
                });
            });
        }

        Meeting.create(data, (createError, result) => {
            if (createError) {
                console.error(createError);

                return res.status(500).send(
                    "Không thể tạo cuộc họp"
                );
            }

            const meetingId = result.insertId;

            const values = participants.map(employeeId => [
                meetingId,
                employeeId
            ]);

            db.query(
                `
                INSERT INTO meeting_participants
                (meeting_id, employee_id)
                VALUES ?
                `,
                [values],
                participantError => {
                    if (participantError) {
                        console.error(participantError);

                        return res.status(500).send(
                            "Không thể lưu người tham gia"
                        );
                    }

                    res.redirect(
                        `/meetings/${meetingId}` +
                        `?message=Tạo cuộc họp thành công`
                    );
                }
            );
        });
    }
);

   };

exports.detail = (req, res) => {
    Meeting.getById(req.params.id, (err, meetings) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Không thể lấy cuộc họp");
        }

        if (meetings.length === 0) {
            return res.status(404).send("Không tìm thấy cuộc họp");
        }

        Meeting.getParticipants(req.params.id, (err, participants) => {
            if (err) {
                console.error(err);
                return res.status(500).send(
                    "Không thể lấy danh sách người tham gia"
                );
            }

            res.render("meeting-detail", {
                meeting: meetings[0],
                participants,
                message: req.query.message || ""
            });
        });
    });
};

exports.showEditForm = (req, res) => {
    Meeting.getById(req.params.id, (err, meetings) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Không thể lấy cuộc họp");
        }

        if (meetings.length === 0) {
            return res.status(404).send("Không tìm thấy cuộc họp");
        }

        Meeting.getParticipants(req.params.id, (err, participants) => {
            if (err) {
                return res.status(500).send(
                    "Không thể lấy danh sách người tham gia"
                );
            }

            getEmployees((err, employees) => {
                if (err) {
                    return res.status(500).send(
                        "Không thể lấy danh sách nhân viên"
                    );
                }

                res.render("meeting-edit", {
                    meeting: meetings[0],
                    employees,
                    selectedParticipants: participants.map(item => item.id),
                    error: ""
                });
            });
        });
    });
};

exports.update = (req, res) => {
    const data = req.body;
    const error = validateMeeting(data);
    const participants = normalizeParticipants(data.participants);

    if (error || participants.length === 0) {
        return getEmployees((err, employees) => {
            if (err) {
                return res.status(500).send(
                    "Không thể lấy danh sách nhân viên"
                );
            }

            res.render("meeting-edit", {
                meeting: {
                    id: req.params.id,
                    ...data
                },
                employees,
                selectedParticipants: participants.map(Number),
                error: error || "Vui lòng chọn ít nhất một người tham gia."
            });
        });
    }

    Meeting.update(req.params.id, data, err => {
        if (err) {
            console.error(err);
            return res.status(500).send("Không thể cập nhật cuộc họp");
        }

        db.query(
            "DELETE FROM meeting_participants WHERE meeting_id = ?",
            [req.params.id],
            err => {
                if (err) {
                    return res.status(500).send(
                        "Không thể cập nhật người tham gia"
                    );
                }

                const values = participants.map(employeeId => [
                    req.params.id,
                    employeeId
                ]);

                db.query(
                    `
                    INSERT INTO meeting_participants
                    (meeting_id, employee_id)
                    VALUES ?
                    `,
                    [values],
                    err => {
                        if (err) {
                            return res.status(500).send(
                                "Không thể lưu người tham gia"
                            );
                        }

                        res.redirect(
                            `/meetings/${req.params.id}?message=Cập nhật cuộc họp thành công`
                        );
                    }
                );
            }
        );
    });
};

exports.complete = (req, res) => {
    Meeting.updateStatus(req.params.id, "completed", err => {
        if (err) {
            return res.status(500).send("Không thể cập nhật trạng thái");
        }

        res.redirect(
            `/meetings/${req.params.id}?message=Đã đánh dấu hoàn thành`
        );
    });
};

exports.cancel = (req, res) => {
    Meeting.updateStatus(req.params.id, "cancelled", err => {
        if (err) {
            return res.status(500).send("Không thể hủy cuộc họp");
        }

        res.redirect(
            `/meetings/${req.params.id}?message=Đã hủy cuộc họp`
        );
    });
};

exports.calendar = (req, res) => {
    res.render("meeting-calendar");
};

exports.getCalendarEvents = (req, res) => {
    Meeting.getAll((err, meetings) => {
        if (err) {
            console.error(err);

            return res.status(500).json({
                message: "Không thể tải dữ liệu lịch họp"
            });
        }

        const events = meetings.map(meeting => {
            const meetingDate = new Date(meeting.meeting_date)
                .toISOString()
                .split("T")[0];

            return {
                id: meeting.id,
                title: meeting.title,
                start: `${meetingDate}T${meeting.start_time}`,
                end: `${meetingDate}T${meeting.end_time}`,
                url: `/meetings/${meeting.id}`,

                extendedProps: {
                    location: meeting.location,
                    organizer: meeting.organizer_name,
                    status: meeting.status
                }
            };
        });

        res.json(events);
    });
};