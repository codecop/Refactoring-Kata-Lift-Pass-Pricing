import express from "express";
import mysql from "mysql2/promise"

async function createApp() {
    const app = express()

    let connectionOptions = {host: 'localhost', user: 'root', port: 3306, database: 'lift_pass'}
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

    async function domainLogic(repository, liftPass, complete) {
        const holidays = await repository.queryHolidays();
        let basePriceCost = await repository.queryPriceFor(liftPass.liftPassType);
        let reduction;
        let isHoliday;
        if (liftPass.liftPassAge < 6) {
            complete({cost: 0})
        } else {
            reduction = 0;
            if (liftPass.liftPassType !== 'night') {
                for (let row of holidays) {
                    const holidayDate = row.holiday.toISOString().split('T')[0]
                    if (liftPass.liftPassDate && liftPass.liftPassDate === holidayDate) {
                        isHoliday = true
                    }

                }
                if (!isHoliday && new Date(liftPass.liftPassDate).getDay() === 0) {
                    reduction = 35
                }

                // TODO apply reduction for others
                if (liftPass.liftPassAge < 15) {
                    complete({cost: Math.ceil(basePriceCost * .7)})
                } else {
                    if (liftPass.liftPassAge === undefined) {
                        let cost = basePriceCost
                        if (reduction) {
                            cost = cost * (1 - reduction / 100)
                        }
                        complete({cost: Math.ceil(cost)})
                    } else {
                        if (liftPass.liftPassAge > 64) {
                            let cost = basePriceCost * .75
                            if (reduction) {
                                cost = cost * (1 - reduction / 100)
                            }
                            complete({cost: Math.ceil(cost)})
                        } else {
                            let cost = basePriceCost
                            if (reduction) {
                                cost = cost * (1 - reduction / 100)
                            }
                            complete({cost: Math.ceil(cost)})
                        }
                    }
                }
            } else {
                if (liftPass.liftPassAge >= 6) {
                    if (liftPass.liftPassAge > 64) {
                        complete({cost: Math.ceil(basePriceCost / 2.5)})
                    } else {
                        complete({cost: basePriceCost});
                    }
                } else {
                    complete({cost: 0})
                }
            }
        }
    }
    const repository = {
        queryPriceFor: async (type) => {
            const result = await connection.query(
                'SELECT cost FROM `base_price` ' +
                'WHERE `type` = ? ',
                [type]);
            return result[0][0].cost;
        },


        queryHolidays: async () => {
            const result = await connection.query(
                'SELECT * FROM `holidays`');
            return result[0];
        }
    };
    app.get('/prices', async (req, res) => {

        // input
        let liftPassType = req.query.type;
        let liftPassDate = req.query.date;
        let liftPassAge = req.query.age;
        const liftPass = { liftPassType, liftPassAge, liftPassDate}

        // ports
        let complete = (payload) => {
            res.send(payload)
        }
        // adapters


        await domainLogic(repository, liftPass, complete);
    })
    return {app, connection}
}

export {createApp}

