const Meeting = require("../models/meetingModel");
const db = require("../config/db");

// ========================================
// HÀM HỖ TRỢ
// ========================================

// Lấy danh sách nhân viên đang hoạt động
function getEmployees(callback) {
    const sql = `
        SELECT
            id,
            employee_code,
            full_name,
            email,
            department,
            position
        FROM employees
        WHERE status = 'active'
        ORDER BY full_name ASC
    `;

    db.query(sql, callback);
}

// Lấy danh sách phòng còn hoạt động
function getMeetingRooms(callback) {
    const sql = `
        SELECT
            id,
            location,
            room_name,
            capacity
        FROM meeting_rooms
        WHERE status = 'available'
        ORDER BY location ASC, room_name ASC
    `;

    db.query(sql, callback);
}

// Chuyển người tham gia về dạng mảng
function normalizeParticipants(participants) {
    if (!participants) {
        return [];
    }

    const values = Array.isArray(participants)
        ? participants
        : [participants];

    return values
        .map(Number)
        .filter(id => Number.isInteger(id) && id > 0);
}

// Kiểm tra dữ liệu cuộc họp
function validateMeeting(data) {
    if (
        !data.title ||
        !data.meeting_date ||
        !data.start_time ||
        !data.end_time ||
        !data.location ||
        !data.room ||
        !data.organizer_id
    ) {
        return "Vui lòng nhập đầy đủ các thông tin bắt buộc.";
    }

    if (data.end_time <= data.start_time) {
        return "Giờ kết thúc phải lớn hơn giờ bắt đầu.";
    }

    const selectedDate = new Date(
        `${data.meeting_date}T${data.start_time}:00`
    );

    const currentTime = new Date();

    if (Number.isNaN(selectedDate.getTime())) {
        return "Ngày hoặc giờ họp không hợp lệ.";
    }

    if (selectedDate < currentTime) {
        return "Không được tạo cuộc họp trong quá khứ.";
    }

    return "";
}// Hiển thị lại form tạo và thông báo lỗi
function renderCreateError(res, data, errorMessage) {
    getEmployees((employeeError, employees) => {
        if (employeeError) {
            console.error(employeeError);

            return res.status(500).send(
                "Không thể lấy danh sách nhân viên."
            );
        }

        getMeetingRooms((roomError, rooms) => {
            if (roomError) {
                console.error(roomError);

                return res.status(500).send(
                    "Không thể lấy phòng họp."
                );
            }

            const selectedParticipants = Array.isArray(data.participants)
                ? data.participants.map(id => Number(id))
                : data.participants
                    ? [Number(data.participants)]
                    : [];

            return res.render("meeting-create", {
                employees,
                rooms,
                formData: data,
                selectedParticipants,
                error: errorMessage
            });
        });
    });
}
// Hiển thị lại form sửa và thông báo lỗi
function renderEditError(
    res,
    meetingId,
    data,
    participants,
    errorMessage
) {
    getEmployees((employeeError, employees) => {
        if (employeeError) {
            console.error(employeeError);

            return res.status(500).send(
                "Không thể lấy danh sách nhân viên."
            );
        }

        getMeetingRooms((roomError, rooms) => {
            if (roomError) {
                console.error(roomError);

                return res.status(500).send(
                    "Không thể lấy danh sách phòng họp."
                );
            }

            return res.render("meeting-edit", {
                meeting: {
                    id: meetingId,
                    ...data
                },
                employees,
                rooms,
                selectedParticipants: participants.map(Number),
                error: errorMessage
            });
        });
    });
}

// Lưu người tham gia của cuộc họp
function insertParticipants(meetingId, participantIds, callback) {
    if (participantIds.length === 0) {
        return callback(null);
    }

    const values = participantIds.map(employeeId => [
        Number(meetingId),
        Number(employeeId)
    ]);

    const sql = `
        INSERT INTO meeting_participants (
            meeting_id,
            employee_id
        )
        VALUES ?
    `;

    db.query(sql, [values], callback);
}

// ========================================
// DANH SÁCH CUỘC HỌP
// ========================================

exports.index = (req, res) => {
    Meeting.getAll((error, meetings) => {
        if (error) {
            console.error(error);

            return res.status(500).send(
                "Không thể lấy danh sách cuộc họp."
            );
        }

        return res.render("meetings", {
            meetings,
            message: req.query.message || ""
        });
    });
};

// ========================================
// FORM TẠO CUỘC HỌP
// ========================================

exports.showCreateForm = (req, res) => {
    getEmployees((employeeError, employees) => {
        if (employeeError) {
            console.error(employeeError);

            return res.status(500).send(
                "Không thể lấy danh sách nhân viên."
            );
        }

        getMeetingRooms((roomError, rooms) => {
            if (roomError) {
                console.error(roomError);

                return res.status(500).send(
                    "Không thể lấy danh sách phòng họp."
                );
            }

            return res.render("meeting-create", {
                employees,
                rooms,
                error: "",
                formData: {}
            });
        });
    });
};

// ========================================
// TẠO CUỘC HỌP
// ========================================

exports.create = (req, res) => {
    const data = req.body;
    const validationError = validateMeeting(data);

    const participants = normalizeParticipants(
        data.participants
    );

    if (validationError) {
        return renderCreateError(
            res,
            data,
            validationError
        );
    }

    if (participants.length === 0) {
        return renderCreateError(
            res,
            data,
            "Vui lòng chọn ít nhất một người tham gia."
        );
    }

    const organizerId = Number(data.organizer_id);

    if (!Number.isInteger(organizerId) || organizerId <= 0) {
        return renderCreateError(
            res,
            data,
            "Người tổ chức không hợp lệ."
        );
    }

    if (participants.includes(organizerId)) {
        return renderCreateError(
            res,
            data,
            "Người tổ chức không được nằm trong danh sách người tham gia."
        );
    }

    const uniqueParticipants = [
        ...new Set(participants)
    ];

    if (
        uniqueParticipants.length !==
        participants.length
    ) {
        return renderCreateError(
            res,
            data,
            "Danh sách người tham gia đang có nhân viên bị chọn trùng."
        );
    }

    const employeeIds = [
        organizerId,
        ...uniqueParticipants
    ];

    // Bước 1: Kiểm tra trùng phòng
    Meeting.checkRoomConflict(
        data,
        null,
        (roomError, roomConflicts) => {
            if (roomError) {
                console.error(roomError);

                return res.status(500).send(
                    "Không thể kiểm tra lịch phòng họp."
                );
            }

            if (roomConflicts.length > 0) {
                const conflict = roomConflicts[0];

                return renderCreateError(
                    res,
                    data,
                    `Phòng ${data.room} đã có cuộc họp ` +
                    `"${conflict.title}" từ ` +
                    `${String(conflict.start_time).substring(0, 5)} ` +
                    `đến ${String(conflict.end_time).substring(0, 5)}.`
                );
            }

            // Bước 2: Kiểm tra lịch nhân viên
            Meeting.checkEmployeeConflict(
                data.meeting_date,
                data.start_time,
                data.end_time,
                employeeIds,
                null,
                (employeeError, employeeConflicts) => {
                    if (employeeError) {
                        console.error(employeeError);

                        return res.status(500).send(
                            "Không thể kiểm tra lịch nhân viên."
                        );
                    }

                    if (employeeConflicts.length > 0) {
                        const names = [
                            ...new Set(
                                employeeConflicts.map(
                                    item => item.full_name
                                )
                            )
                        ];

                        const meetingTitles = [
                            ...new Set(
                                employeeConflicts.map(
                                    item => item.title
                                )
                            )
                        ];

                        return renderCreateError(
                            res,
                            data,
                            `Nhân viên bị trùng lịch: ` +
                            `${names.join(", ")}. ` +
                            `Cuộc họp đang diễn ra: ` +
                            `${meetingTitles.join(", ")}.`
                        );
                    }

                    // Bước 3: Lưu cuộc họp
                    Meeting.create(
                        data,
                        (createError, result) => {
                            if (createError) {
                                console.error(createError);

                                return res.status(500).send(
                                    "Không thể tạo cuộc họp."
                                );
                            }

                            const meetingId =
                                result.insertId;

                            // Bước 4: Lưu người tham gia
                            insertParticipants(
                                meetingId,
                                uniqueParticipants,
                                participantError => {
                                    if (participantError) {
                                        console.error(
                                            participantError
                                        );

                                        return res
                                            .status(500)
                                            .send(
                                                "Đã tạo cuộc họp nhưng không thể lưu người tham gia."
                                            );
                                    }

                                    return res.redirect(
                                        `/meetings/${meetingId}` +
                                        `?message=${encodeURIComponent(
                                            "Tạo cuộc họp thành công"
                                        )}`
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

// ========================================
// CHI TIẾT CUỘC HỌP
// ========================================

exports.detail = (req, res) => {
    const meetingId = Number(req.params.id);

    Meeting.getById(meetingId, (error, meetings) => {
        if (error) {
            console.error(error);

            return res.status(500).send(
                "Không thể lấy thông tin cuộc họp."
            );
        }

        if (meetings.length === 0) {
            return res.status(404).send(
                "Không tìm thấy cuộc họp."
            );
        }

        Meeting.getParticipants(
            meetingId,
            (participantError, participants) => {
                if (participantError) {
                    console.error(participantError);

                    return res.status(500).send(
                        "Không thể lấy danh sách người tham gia."
                    );
                }

                return res.render("meeting-detail", {
                    meeting: meetings[0],
                    participants,
                    message: req.query.message || ""
                });
            }
        );
    });
};

// ========================================
// FORM SỬA CUỘC HỌP
// ========================================

exports.showEditForm = (req, res) => {
    const meetingId = req.params.id;

    Meeting.getById(meetingId, (meetingError, meetingResults) => {
        if (meetingError) {
            console.error(meetingError);
            return res.status(500).send("Không thể lấy thông tin cuộc họp.");
        }

        if (!meetingResults.length) {
            return res.status(404).send("Không tìm thấy cuộc họp.");
        }

        const meeting = meetingResults[0];

        Meeting.getParticipants(meetingId, (participantError, participants) => {
            if (participantError) {
                console.error(participantError);
                return res.status(500).send("Không thể lấy người tham gia.");
            }

            const employeeSql = `
                SELECT *
                FROM employees
                WHERE status = 'active'
                ORDER BY full_name
            `;

            db.query(employeeSql, (employeeError, employees) => {
                if (employeeError) {
                    console.error(employeeError);
                    return res.status(500).send("Không thể lấy nhân viên.");
                }

                const roomSql = `
                    SELECT
                        id,
                        location,
                        room_name,
                        capacity
                    FROM meeting_rooms
                    WHERE status = 'available'
                    ORDER BY location, room_name
                `;

                db.query(roomSql, (roomError, rooms) => {
                    if (roomError) {
                        console.error(roomError);
                        return res.status(500).send("Không thể lấy phòng họp.");
                    };

                res.render("meeting-edit", {
                    meeting,
                    employees,
                    rooms,
                    selectedParticipants: participants.map(
                        participant => Number(participant.id)
                    ),
                    error: ""
                });
                });
            });
        });
    });
};

// ========================================
// CẬP NHẬT CUỘC HỌP
// ========================================

exports.update = (req, res) => {
    const meetingId = Number(req.params.id);
    const data = req.body;

    const validationError = validateMeeting(data);

    const participants = normalizeParticipants(
        data.participants
    );

    if (validationError) {
        return renderEditError(
            res,
            meetingId,
            data,
            participants,
            validationError
        );
    }

    if (participants.length === 0) {
        return renderEditError(
            res,
            meetingId,
            data,
            participants,
            "Vui lòng chọn ít nhất một người tham gia."
        );
    }

    const organizerId = Number(data.organizer_id);

    if (participants.includes(organizerId)) {
        return renderEditError(
            res,
            meetingId,
            data,
            participants,
            "Người tổ chức không được nằm trong danh sách người tham gia."
        );
    }

    const uniqueParticipants = [
        ...new Set(participants)
    ];

    if (
        uniqueParticipants.length !==
        participants.length
    ) {
        return renderEditError(
            res,
            meetingId,
            data,
            participants,
            "Danh sách người tham gia đang có nhân viên bị chọn trùng."
        );
    }

    const employeeIds = [
        organizerId,
        ...uniqueParticipants
    ];

    // Kiểm tra phòng, bỏ qua cuộc họp đang sửa
    Meeting.checkRoomConflict(
        data,
        meetingId,
        (roomError, roomConflicts) => {
            if (roomError) {
                console.error(roomError);

                return res.status(500).send(
                    "Không thể kiểm tra lịch phòng họp."
                );
            }

            if (roomConflicts.length > 0) {
                const conflict = roomConflicts[0];

                return renderEditError(
                    res,
                    meetingId,
                    data,
                    uniqueParticipants,
                    `Phòng ${data.room} đã có cuộc họp ` +
                    `"${conflict.title}" từ ` +
                    `${String(conflict.start_time).substring(0, 5)} ` +
                    `đến ${String(conflict.end_time).substring(0, 5)}.`
                );
            }

            // Kiểm tra lịch nhân viên
            Meeting.checkEmployeeConflict(
                data.meeting_date,
                data.start_time,
                data.end_time,
                employeeIds,
                meetingId,
                (
                    employeeError,
                    employeeConflicts
                ) => {
                    if (employeeError) {
                        console.error(employeeError);

                        return res.status(500).send(
                            "Không thể kiểm tra lịch nhân viên."
                        );
                    }

                    if (employeeConflicts.length > 0) {
                        const names = [
                            ...new Set(
                                employeeConflicts.map(
                                    item => item.full_name
                                )
                            )
                        ];

                        return renderEditError(
                            res,
                            meetingId,
                            data,
                            uniqueParticipants,
                            `Nhân viên bị trùng lịch: ` +
                            `${names.join(", ")}.`
                        );
                    }

                    // Cập nhật thông tin cuộc họp
                    Meeting.update(
                        meetingId,
                        data,
                        updateError => {
                            if (updateError) {
                                console.error(updateError);

                                return res.status(500).send(
                                    "Không thể cập nhật cuộc họp."
                                );
                            }

                            // Xóa danh sách người tham gia cũ
                            db.query(
                                `
                                DELETE FROM meeting_participants
                                WHERE meeting_id = ?
                                `,
                                [meetingId],
                                deleteError => {
                                    if (deleteError) {
                                        console.error(
                                            deleteError
                                        );

                                        return res
                                            .status(500)
                                            .send(
                                                "Không thể cập nhật danh sách người tham gia."
                                            );
                                    }

                                    // Thêm lại danh sách mới
                                    insertParticipants(
                                        meetingId,
                                        uniqueParticipants,
                                        participantError => {
                                            if (
                                                participantError
                                            ) {
                                                console.error(
                                                    participantError
                                                );

                                                return res
                                                    .status(500)
                                                    .send(
                                                        "Không thể lưu danh sách người tham gia."
                                                    );
                                            }

                                            return res.redirect(
                                                `/meetings/${meetingId}` +
                                                `?message=${encodeURIComponent(
                                                    "Cập nhật cuộc họp thành công"
                                                )}`
                                            );
                                        }
                                    );
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

// ========================================
// HOÀN THÀNH CUỘC HỌP
// ========================================

exports.complete = (req, res) => {
    const meetingId = Number(req.params.id);

    Meeting.getById(meetingId, (findError, meetings) => {
        if (findError) {
            console.error(findError);

            return res.status(500).send(
                "Không thể kiểm tra cuộc họp."
            );
        }

        if (meetings.length === 0) {
            return res.status(404).send(
                "Không tìm thấy cuộc họp."
            );
        }

        if (meetings[0].status !== "scheduled") {
            return res.status(400).send(
                "Cuộc họp này không thể đánh dấu hoàn thành."
            );
        }

        Meeting.updateStatus(
            meetingId,
            "completed",
            error => {
                if (error) {
                    console.error(error);

                    return res.status(500).send(
                        "Không thể cập nhật trạng thái."
                    );
                }

                return res.redirect(
                    `/meetings/${meetingId}` +
                    `?message=${encodeURIComponent(
                        "Đã đánh dấu cuộc họp hoàn thành"
                    )}`
                );
            }
        );
    });
};

// ========================================
// HỦY CUỘC HỌP
// ========================================

exports.cancel = (req, res) => {
    const meetingId = Number(req.params.id);

    Meeting.getById(meetingId, (findError, meetings) => {
        if (findError) {
            console.error(findError);

            return res.status(500).send(
                "Không thể kiểm tra cuộc họp."
            );
        }

        if (meetings.length === 0) {
            return res.status(404).send(
                "Không tìm thấy cuộc họp."
            );
        }

        if (meetings[0].status !== "scheduled") {
            return res.status(400).send(
                "Chỉ được hủy cuộc họp đang ở trạng thái đã lên lịch."
            );
        }

        Meeting.updateStatus(
            meetingId,
            "cancelled",
            error => {
                if (error) {
                    console.error(error);

                    return res.status(500).send(
                        "Không thể hủy cuộc họp."
                    );
                }

                return res.redirect(
                    `/meetings/${meetingId}` +
                    `?message=${encodeURIComponent(
                        "Đã hủy cuộc họp"
                    )}`
                );
            }
        );
    });
};

// ========================================
// TRANG CALENDAR
// ========================================

exports.calendar = (req, res) => {
    return res.render("meeting-calendar");
};

// ========================================
// API DỮ LIỆU CALENDAR
// ========================================

exports.getCalendarEvents = (req, res) => {
    Meeting.getAll((error, meetings) => {
        if (error) {
            console.error(error);

            return res.status(500).json({
                message: "Không thể tải dữ liệu lịch họp."
            });
        }

        const events = meetings.map(meeting => {
            const date = new Date(meeting.meeting_date);

            const meetingDate = [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0")
            ].join("-");

            return {
                id: meeting.id,
                title: meeting.title,

                start:
                    `${meetingDate}T${meeting.start_time}`,

                end:
                    `${meetingDate}T${meeting.end_time}`,

                extendedProps: {
                    location: meeting.location,
                    room: meeting.room,               // thêm dòng này
                    organizer: meeting.organizer_name,
                    status: meeting.status
                }
            };
        });

        return res.json(events);
    });
};