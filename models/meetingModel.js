const db = require("../config/db");

const Meeting = {
    getAll(callback) {
        const sql = `
            SELECT
                m.*,
                e.full_name AS organizer_name
            FROM meetings m
            JOIN employees e ON m.organizer_id = e.id
            ORDER BY m.meeting_date ASC, m.start_time ASC
        `;

        db.query(sql, callback);
    },

    getById(id, callback) {
        const sql = `
            SELECT
                m.*,
                e.full_name AS organizer_name
            FROM meetings m
            JOIN employees e ON m.organizer_id = e.id
            WHERE m.id = ?
        `;

        db.query(sql, [id], callback);
    },

    getParticipants(meetingId, callback) {
        const sql = `
            SELECT
                e.id,
                e.employee_code,
                e.full_name,
                e.email,
                e.department
            FROM meeting_participants mp
            JOIN employees e ON mp.employee_id = e.id
            WHERE mp.meeting_id = ?
            ORDER BY e.full_name
        `;

        db.query(sql, [meetingId], callback);
    },

    create(data, callback) {
        const sql = `
            INSERT INTO meetings (
                title,
                description,
                meeting_date,
                start_time,
                end_time,
                location,
                organizer_id,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            data.title,
            data.description || null,
            data.meeting_date,
            data.start_time,
            data.end_time,
            data.location,
            data.organizer_id,
            data.status || "scheduled"
        ];

        db.query(sql, values, callback);
    },

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
            data.organizer_id,
            id
        ];

        db.query(sql, values, callback);
    },

    updateStatus(id, status, callback) {
        const sql = `
            UPDATE meetings
            SET status = ?
            WHERE id = ?
        `;

        db.query(sql, [status, id], callback);
    },


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

    getUpcoming(limit, callback) {
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

        db.query(sql, [Number(limit)], callback);
    },

    checkEmployeeConflict(
    meetingDate,
    startTime,
    endTime,
    employeeIds,
    callback
) {
    const sql = `
        SELECT DISTINCT
            e.id,
            e.full_name,
            m.title,
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

    db.query(
        sql,
        [
            employeeIds,
            meetingDate,
            endTime,
            startTime
        ],
        callback
    );
},

};

module.exports = Meeting;