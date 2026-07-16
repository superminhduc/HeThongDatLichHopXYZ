const db = require("../config/db");

const Meeting = {
    // Lấy toàn bộ cuộc họp
    getAll(callback) {
        const sql = `
            SELECT
                m.*,
                e.full_name AS organizer_name
            FROM meetings m
            JOIN employees e
                ON m.organizer_id = e.id
            ORDER BY
                m.meeting_date ASC,
                m.start_time ASC
        `;

        db.query(sql, callback);
    },

    // Lấy một cuộc họp theo ID
    getById(id, callback) {
        const sql = `
            SELECT
                m.*,
                e.full_name AS organizer_name
            FROM meetings m
            JOIN employees e
                ON m.organizer_id = e.id
            WHERE m.id = ?
        `;

        db.query(sql, [id], callback);
    },

    // Lấy danh sách người tham gia
    getParticipants(meetingId, callback) {
        const sql = `
            SELECT
                e.id,
                e.employee_code,
                e.full_name,
                e.email,
                e.department,
                e.position
            FROM meeting_participants mp
            JOIN employees e
                ON mp.employee_id = e.id
            WHERE mp.meeting_id = ?
            ORDER BY e.full_name ASC
        `;

        db.query(sql, [meetingId], callback);
    },

    // Tạo cuộc họp
    create(data, callback) {
        const sql = `
            INSERT INTO meetings (
                title,
                description,
                meeting_date,
                start_time,
                end_time,
                location,
                room,
                organizer_id,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            data.title,
            data.description || null,
            data.meeting_date,
            data.start_time,
            data.end_time,
            data.location,
            data.room,
            Number(data.organizer_id),
            data.status || "scheduled"
        ];

        db.query(sql, values, callback);
    },

    // Cập nhật cuộc họp
    update(id, data, callback) {
        const sql = `
            UPDATE meetings
            SET
                title = ?,
                description = ?,
                meeting_date = ?,
                start_time = ?,
                end_time = ?,
                location = ?,
                room = ?,
                organizer_id = ?
            WHERE id = ?
        `;

        const values = [
            data.title,
            data.description || null,
            data.meeting_date,
            data.start_time,
            data.end_time,
            data.location,
            data.room,
            Number(data.organizer_id),
            Number(id)
        ];

        db.query(sql, values, callback);
    },

    // Cập nhật trạng thái
    updateStatus(id, status, callback) {
        const sql = `
            UPDATE meetings
            SET status = ?
            WHERE id = ?
        `;

        db.query(sql, [status, Number(id)], callback);
    },

    // Thống kê dashboard
    getDashboardStats(callback) {
        const sql = `
            SELECT
                SUM(
                    CASE
                        WHEN meeting_date = CURDATE()
                            AND status = 'scheduled'
                        THEN 1
                        ELSE 0
                    END
                ) AS today_count,

                SUM(
                    CASE
                        WHEN meeting_date > CURDATE()
                            AND status = 'scheduled'
                        THEN 1
                        ELSE 0
                    END
                ) AS upcoming_count,

                SUM(
                    CASE
                        WHEN status = 'completed'
                        THEN 1
                        ELSE 0
                    END
                ) AS completed_count,

                SUM(
                    CASE
                        WHEN status = 'cancelled'
                        THEN 1
                        ELSE 0
                    END
                ) AS cancelled_count
            FROM meetings
        `;

        db.query(sql, callback);
    },

    // Lấy các cuộc họp sắp tới
    getUpcoming(limit, callback) {
        const safeLimit = Number(limit);

        const sql = `
            SELECT
                m.*,
                e.full_name AS organizer_name
            FROM meetings m
            JOIN employees e
                ON m.organizer_id = e.id
            WHERE
                m.status = 'scheduled'
                AND (
                    m.meeting_date > CURDATE()
                    OR (
                        m.meeting_date = CURDATE()
                        AND m.end_time >= CURTIME()
                    )
                )
            ORDER BY
                m.meeting_date ASC,
                m.start_time ASC
            LIMIT ?
        `;

        db.query(sql, [safeLimit], callback);
    },

    // Kiểm tra phòng họp bị trùng thời gian
    checkRoomConflict(data, excludeMeetingId, callback) {
        let sql = `
            SELECT
                id,
                title,
                meeting_date,
                room,
                start_time,
                end_time
            FROM meetings
            WHERE
                meeting_date = ?
                AND LOWER(TRIM(room)) = LOWER(TRIM(?))
                AND status <> 'cancelled'
                AND start_time < ?
                AND end_time > ?
        `;

        const values = [
            data.meeting_date,
            data.room,
            data.end_time,
            data.start_time
        ];

        // Khi sửa cuộc họp, bỏ qua chính cuộc họp đang sửa
        if (excludeMeetingId) {
            sql += " AND id <> ?";
            values.push(Number(excludeMeetingId));
        }

        db.query(sql, values, callback);
    },

    // Kiểm tra người tổ chức và người tham gia bị trùng lịch
    checkEmployeeConflict(
        meetingDate,
        startTime,
        endTime,
        employeeIds,
        excludeMeetingId,
        callback
    ) {
        if (!Array.isArray(employeeIds) || employeeIds.length === 0) {
            return callback(null, []);
        }

        let sql = `
            SELECT DISTINCT
                e.id,
                e.full_name,
                m.id AS meeting_id,
                m.title,
                m.meeting_date,
                m.start_time,
                m.end_time
            FROM employees e

            JOIN (
                SELECT
                    organizer_id AS employee_id,
                    id AS meeting_id
                FROM meetings

                UNION

                SELECT
                    employee_id,
                    meeting_id
                FROM meeting_participants
            ) employee_meetings
                ON employee_meetings.employee_id = e.id

            JOIN meetings m
                ON m.id = employee_meetings.meeting_id

            WHERE
                e.id IN (?)
                AND m.meeting_date = ?
                AND m.status <> 'cancelled'
                AND m.start_time < ?
                AND m.end_time > ?
        `;

        const values = [
            employeeIds,
            meetingDate,
            endTime,
            startTime
        ];

        // Khi sửa, bỏ qua lịch hiện tại
        if (excludeMeetingId) {
            sql += " AND m.id <> ?";
            values.push(Number(excludeMeetingId));
        }

        sql += `
            ORDER BY
                e.full_name ASC,
                m.start_time ASC
        `;

        db.query(sql, values, callback);
    }
};

module.exports = Meeting;