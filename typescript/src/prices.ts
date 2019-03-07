import express from "express";
import mysql from "mysql2/promise"

async function createApp() {
    const app = express()

    let connectionOptions = {host: 'localhost', user: 'root', port: 3306, database: 'lift_pass' }
    const connection = await mysql.createConnection(connectionOptions);

    // cost, type, date, age,

    app.put('/prices', async (req, res) => {
        // ui
        const liftPassCost = req.query.cost
        const liftPassType = req.query.type
        // db
        const [rows, fields] = await connection.execute(
            'INSERT INTO `base_price` (type, cost) VALUES (?, ?) ' +
            'ON DUPLICATE KEY UPDATE cost = ?',
            [liftPassType, liftPassCost, liftPassCost]);

        res.send()
    })
    app.get('/prices', async (req, res) => {

        // db
        let liftPassType = req.query.type;
        let liftPassDate = req.query.date;
        let liftPassAge = req.query.age;

        const result = (await connection.query(
            'SELECT cost FROM `base_price` ' +
            'WHERE `type` = ? ',
            [liftPassType]))[0][0]
        let reduction;
        let isHoliday;

        let complete = (payload) => {
            res.send(payload)
        }
        if (liftPassAge < 6) {
            complete({cost: 0})
        } else {
            reduction = 0;
            if (liftPassType !== 'night') {

                const holidays = (await connection.query(
                    'SELECT * FROM `holidays`'
                ))[0]
                for (let row of holidays) {
                    const holidayDate = row.holiday.toISOString().split('T')[0]
                    if (liftPassDate && liftPassDate === holidayDate) {
                        isHoliday = true
                    }

                }
                if (!isHoliday && new Date(liftPassDate).getDay() === 0) {
                    reduction = 35
                }

                // TODO apply reduction for others
                if (liftPassAge < 15) {
                    complete({cost: Math.ceil(result.cost * .7)})
                } else {
                    if (liftPassAge === undefined) {
                        let cost = result.cost
                        if (reduction) {
                            cost = cost * (1 - reduction / 100)
                        }
                        complete({cost: Math.ceil(cost)})
                    } else {
                        if (liftPassAge > 64) {
                            let cost = result.cost * .75
                            if (reduction) {
                                cost = cost * (1 - reduction / 100)
                            }
                            complete({cost: Math.ceil(cost)})
                        } else {
                            let cost = result.cost
                            if (reduction) {
                                cost = cost * (1 - reduction / 100)
                            }
                            complete({cost: Math.ceil(cost)})
                        }
                    }
                }
            } else {
                if (liftPassAge >= 6) {
                    if (liftPassAge > 64) {
                        complete({cost: Math.ceil(result.cost / 2.5)})
                    } else {
                        complete(result)
                    }
                } else {
                    complete({cost: 0})
                }
            }
        }
    })
    return {app, connection}
}

export {createApp}

