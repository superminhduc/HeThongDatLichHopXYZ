const Employee = require("../models/employeeModel");

exports.index = (req, res) => {
    Employee.getAll((err, employees) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Không thể lấy danh sách nhân viên");
        }

        res.render("employees", {
            employees,
            message: req.query.message || ""
        });
    });
};

exports.showCreateForm = (req, res) => {
    res.render("employee-create", {
        error: ""
    });
};

exports.create = (req, res) => {
    const data = req.body;

    if (!data.employee_code || !data.full_name || !data.email) {
        return res.render("employee-create", {
            error: "Mã nhân viên, họ tên và email là bắt buộc."
        });
    }

    Employee.create(data, (err) => {
        if (err) {
            console.error(err);

            if (err.code === "ER_DUP_ENTRY") {
                return res.render("employee-create", {
                    error: "Mã nhân viên hoặc email đã tồn tại."
                });
            }

            return res.status(500).send("Không thể thêm nhân viên");
        }

        res.redirect("/employees?message=Thêm nhân viên thành công");
    });
};

exports.showEditForm = (req, res) => {
    Employee.getById(req.params.id, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send("Không thể lấy thông tin nhân viên");
        }

        if (results.length === 0) {
            return res.status(404).send("Không tìm thấy nhân viên");
        }

        res.render("employee-edit", {
            employee: results[0],
            error: ""
        });
    });
};

exports.update = (req, res) => {
    const data = req.body;

    if (!data.employee_code || !data.full_name || !data.email) {
        return res.render("employee-edit", {
            employee: {
                id: req.params.id,
                ...data
            },
            error: "Mã nhân viên, họ tên và email là bắt buộc."
        });
    }

    Employee.update(req.params.id, data, (err) => {
        if (err) {
            console.error(err);

            if (err.code === "ER_DUP_ENTRY") {
                return res.render("employee-edit", {
                    employee: {
                        id: req.params.id,
                        ...data
                    },
                    error: "Mã nhân viên hoặc email đã tồn tại."
                });
            }

            return res.status(500).send("Không thể cập nhật nhân viên");
        }

        res.redirect("/employees?message=Cập nhật nhân viên thành công");
    });
};

exports.delete = (req, res) => {
    Employee.delete(req.params.id, (err) => {
        if (err) {
            console.error(err);

            if (err.code === "ER_ROW_IS_REFERENCED_2") {
                return res.redirect(
                    "/employees?message=Không thể xóa nhân viên đang liên quan đến cuộc họp"
                );
            }

            return res.status(500).send("Không thể xóa nhân viên");
        }

        res.redirect("/employees?message=Xóa nhân viên thành công");
    });
};