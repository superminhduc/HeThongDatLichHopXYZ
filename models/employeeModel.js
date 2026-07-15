const db = require("../config/db");

const Employee = {
    getAll(callback) {
        db.query("SELECT * FROM employees ORDER BY id DESC", callback);
    },

    getById(id, callback) {
        db.query(
            "SELECT * FROM employees WHERE id = ?",
            [id],
            callback
        );
    },

    create(data, callback) {
        const sql = `
            INSERT INTO employees
            (
                employee_code,
                full_name,
                email,
                phone,
                department,
                position,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
            data.employee_code,
            data.full_name,
            data.email,
            data.phone,
            data.department,
            data.position,
            data.status || "active"
        ];

        db.query(sql, values, callback);
    },

    update(id, data, callback) {
        const sql = `
            UPDATE employees
            SET
                employee_code = ?,
                full_name = ?,
                email = ?,
                phone = ?,
                department = ?,
                position = ?,
                status = ?
            WHERE id = ?
        `;

        const values = [
            data.employee_code,
            data.full_name,
            data.email,
            data.phone,
            data.department,
            data.position,
            data.status,
            id
        ];

        db.query(sql, values, callback);
    },

    delete(id, callback) {
        db.query(
            "DELETE FROM employees WHERE id = ?",
            [id],
            callback
        );
    }
};

module.exports = Employee;