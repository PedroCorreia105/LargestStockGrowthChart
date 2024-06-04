const fs = require("fs");
const path = require("path");
const cliProgress = require("cli-progress");

const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
const dataFolder = "./data";
const outputFolder = "./processed-data";
const dailyOutputFile = outputFolder + "/daily-result.json";
const weeklyOutputFile = outputFolder + "/weekly-result.json";
const monthlyOutputFile = outputFolder + "/monthly-result.json";

const FIRST_DAYS_IGNORED = 10;
const MINIMUM_VOLUME = 1000;
const MINIMUM_OPEN = 2;

try {
    console.log("Registering files...");
    const files = obtainFiles(dataFolder);
    const screenerData = obtainScreenerData();

    console.log("Processing files...");
    processFiles(files, screenerData);
} catch (error) {
    console.error("Error:", error);
}

function obtainFiles(folderPath, results = []) {
    try {
        const files = fs.readdirSync(folderPath);
        files.forEach((file) => {
            const filePath = path.join(folderPath, file);

            if (fs.statSync(filePath).isDirectory()) {
                obtainFiles(filePath, results);
                // Ignore test ticker
            } else if (path.extname(file).toLowerCase() === ".txt" && !file.includes("zvzzt")) {
                results.push(filePath);
            }
        });
        return results;
    } catch (err) {
        throw new Error("Download daily US ASCII file from https://stooq.com/db/h/ and extract it to a data folder.");
    }
}

function obtainScreenerData() {
    const csvFiles = fs.readdirSync(dataFolder).filter((file) => path.extname(file).toLowerCase() === ".csv");
    const result = {};

    if (csvFiles.length !== 1) {
        throw new Error(
            "Download CSV from https://www.nasdaq.com/market-activity/stocks/screener and place it in the data folder"
        );
    }

    const lines = fs.readFileSync(path.join(dataFolder, csvFiles[0]), "utf8").split("\r\n");

    for (let i = 1; i < lines.length - 1; i++) {
        let [ticker, name, lastSale, netChange, change, marketCap, country, ipoYear, volume, sector, industry] =
            lines[i].split(",");
        name = name
            .replace(/ Common Stock.*/gi, "")
            .replace(/ Class A Ordinary Share.*/gi, "")
            .replace(/ Ordinary Share.*/gi, "")
            .replace(/ Common Shares.*/gi, "")
            .replace(/ Class A Common Voting Share.*/gi, "")
            .replace(/ American Depositary Share.*/gi, "")
            .replace(/ Trust Shares of Beneficial Interest.*/gi, "")
            .replace(/ American Depository Share.*/gi, "")
            .replace(/  \(.*/gi, "");
        marketCap = parseFloat(marketCap);
        volume = parseFloat(volume);
        result[ticker] = {
            name,
            marketCap,
            country,
            sector,
            industry,
        };
    }
    return result;
}

function processFiles(files, screenerData) {
    let maxDailyResults = {};
    let maxWeeklyResults = {};
    let maxMonthlyResults = {};
    progressBar.start(files.length, 0);
    var results;

    for (let i = 0; i < files.length; i++) {
        progressBar.update(i + 1);
        const lines = fs.readFileSync(files[i], "utf-8").split("\r\n");
        results = calculateIncreases(lines);

        // Update max daily map
        for (let date in results.dailyResults) {
            if (
                results.dailyResults[date].open >= MINIMUM_OPEN &&
                results.dailyResults[date].volume >= MINIMUM_VOLUME &&
                results.dailyResults[date].increase >= 0 &&
                (!maxDailyResults[date] || results.dailyResults[date].increase > maxDailyResults[date].increase)
            ) {
                maxDailyResults[date] = results.dailyResults[date];
            }
        }

        // Update max weekly map
        for (let date in results.weeklyResults) {
            if (
                results.weeklyResults[date].open >= MINIMUM_OPEN &&
                results.weeklyResults[date].volume >= MINIMUM_VOLUME &&
                results.weeklyResults[date].average_volume >= MINIMUM_VOLUME &&
                results.weeklyResults[date].increase >= 0 &&
                (!maxWeeklyResults[date] || results.weeklyResults[date].increase > maxWeeklyResults[date].increase)
            ) {
                maxWeeklyResults[date] = results.weeklyResults[date];
            }
        }

        // Update max monthly map
        for (let date in results.monthlyResults) {
            if (
                results.monthlyResults[date].open >= MINIMUM_OPEN &&
                results.monthlyResults[date].volume >= MINIMUM_VOLUME &&
                results.monthlyResults[date].average_volume >= MINIMUM_VOLUME &&
                results.monthlyResults[date].increase >= 0 &&
                (!maxMonthlyResults[date] || results.monthlyResults[date].increase > maxMonthlyResults[date].increase)
            ) {
                maxMonthlyResults[date] = results.monthlyResults[date];
            }
        }
    }

    progressBar.stop();
    fs.mkdirSync(outputFolder, { recursive: true });

    console.log("Saving daily results...");
    maxDailyResults = Object.values(maxDailyResults)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((entry) => ({ ...entry, ...screenerData[entry.ticker] }));
    fs.writeFileSync(dailyOutputFile, JSON.stringify(maxDailyResults, null, 2));

    console.log("Saving weekly results...");
    maxWeeklyResults = Object.values(maxWeeklyResults)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((entry) => ({ ...entry, ...screenerData[entry.ticker] }));
    fs.writeFileSync(weeklyOutputFile, JSON.stringify(maxWeeklyResults, null, 2));

    console.log("Saving monthly results...");
    maxMonthlyResults = Object.values(maxMonthlyResults)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((entry) => ({ ...entry, ...screenerData[entry.ticker] }));
    fs.writeFileSync(monthlyOutputFile, JSON.stringify(maxMonthlyResults, null, 2));
}

function calculateIncreases(lines) {
    const dailyResults = {};
    const weeklyResults = {};
    const monthlyResults = {};
    const weeklyIncreases = {};
    const monthlyIncreases = {};

    for (let i = 1 + FIRST_DAYS_IGNORED; i < lines.length - 1; i++) {
        let [ticker, , date, , open, high, low, close, volume] = lines[i].split(",");
        date = parseDate(date);
        open = parseFloat(open);
        high = parseFloat(high);
        low = parseFloat(low);
        close = parseFloat(close);
        volume = parseFloat(volume);
        // Remove ".US" , workaround for Berkshire and remove -
        ticker = ticker.slice(0, -3).replace("-A", "/A").split("-")[0];

        const day = date.toISOString().split("T")[0];
        const startOfWeek = getStartOfWeek(date).toISOString().split("T")[0];
        const startOfMonth = getStartOfMonth(date).toISOString().split("T")[0];

        dailyResults[day] = {
            date: day,
            ticker,
            open,
            high,
            low,
            close,
            volume,
            increase: ((close - open) * 100) / open,
        };

        // Group by week using its first day
        if (!weeklyIncreases[startOfWeek]) {
            weeklyIncreases[startOfWeek] = [];
        }
        weeklyIncreases[startOfWeek].push({ ticker, open, high, low, close, volume, day });

        // Group by month using its first day
        if (!monthlyIncreases[startOfMonth]) {
            monthlyIncreases[startOfMonth] = [];
        }
        monthlyIncreases[startOfMonth].push({ ticker, open, high, low, close, volume, day });
    }

    // Calculate increases for each week
    for (let week in weeklyIncreases) {
        const values = weeklyIncreases[week];
        if (values.length >= 3) {
            weeklyResults[week] = {
                ticker: values[0].ticker,
                open: values[0].open,
                close: values[values.length - 1].close,
                date: values[0].day,
                end_date: values[values.length - 1].day,
                volume: values.reduce((a, b) => a + b.volume, 0),
                average_volume: values.reduce((a, b) => a + b.volume, 0) / values.length,
                increase: ((values[values.length - 1].close - values[0].open) * 100) / values[0].open,
            };
        }
    }

    // Calculate increases for each month
    for (let month in monthlyIncreases) {
        const values = monthlyIncreases[month];
        if (values.length >= 10) {
            monthlyResults[month] = {
                ticker: values[0].ticker,
                open: values[0].open,
                close: values[values.length - 1].close,
                date: values[0].day,
                end_date: values[values.length - 1].day,
                volume: values.reduce((a, b) => a + b.volume, 0),
                average_volume: values.reduce((a, b) => a + b.volume, 0) / values.length,
                increase: ((values[values.length - 1].close - values[0].open) * 100) / values[0].open,
            };
        }
    }

    return { dailyResults, weeklyResults, monthlyResults };
}

// Helper function to parse date in YYYYMMDD format to a JavaScript Date object
function parseDate(dateString) {
    const year = parseInt(dateString.substring(0, 4));
    const month = parseInt(dateString.substring(4, 6));
    const day = parseInt(dateString.substring(6, 8));
    return new Date(Date.UTC(year, month - 1, day));
}

function getStartOfWeek(date) {
    const day = date.getDay();
    const diff = day === 0 ? 6 : day - 1; // Adjust when day is Sunday
    return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate() - diff));
}

function getStartOfMonth(date) {
    const firstDay = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
    const day = firstDay.getDay();
    const diff = day === 0 ? 1 : day === 6 ? 2 : 0; // Adjust if the first day is Saturday or Sunday
    return new Date(Date.UTC(firstDay.getFullYear(), firstDay.getMonth(), firstDay.getDate() + diff));
}
