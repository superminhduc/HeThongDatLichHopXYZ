const Meeting = require("../models/meetingModel");

exports.index = (req, res) => {
    Meeting.getDashboardStats((statsError, statsResults) => {
        if (statsError) {
            console.error(statsError);

            return res.status(500).send(
                "Không thể tải thống kê cuộc họp"
            );
        }

        Meeting.getUpcoming(6, (meetingsError, upcomingMeetings) => {
            if (meetingsError) {
                console.error(meetingsError);

                return res.status(500).send(
                    "Không thể tải danh sách cuộc họp"
                );
            }

            const stats = statsResults[0] || {
                today_count: 0,
                upcoming_count: 0,
                completed_count: 0,
                cancelled_count: 0
            };

            res.render("dashboard", {
                stats,
                upcomingMeetings
            });
        });
    });
};