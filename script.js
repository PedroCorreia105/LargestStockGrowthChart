const margin = { top: 20, right: 60, bottom: 60, left: 60 };
const headerHeight = 100;
const notesHeight = 40;
const sliderHeight = 60;
const minBarWidth = 5;
const container = d3.select("div#container");
const svgChart = d3.select("svg#chart");
const svg = svgChart.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const zoomableArea = svg.append("rect");
const xScale = d3.scaleBand().padding(0.2);
const xAxis = d3
    .axisBottom(xScale)
    .tickSize(5)
    .tickSizeOuter(0)
    .tickPadding(10)
    .tickFormat((d) => d3.timeFormat("%Y %b %e")(new Date(d)));
const xAxisG = svg.append("g").attr("class", "x-axis");
const yScale = d3.scaleLinear();
const yAxis = d3
    .axisLeft(yScale)
    .tickSizeOuter(0)
    .tickSize(0)
    .tickPadding(10)
    .tickFormat((d) => d + "%");
const yAxisG = svg.append("g").attr("class", "y-axis");
// Number of ticks in the scale depend on the size of the chart
let xTicks, yTicks;
// Store data in case of re-render
var filteredData, originalData;
// Date values used for setting the slider end points
var minDate, maxDate;
// Date values used for filtering data stored in case of re-render
var lowerBound, upperBound;
// monthly, weekly or daily
var timeFrame = "monthly";
// Ensure the time frame switch is not executed while in animation
var canBeSwitched = true;

// Initial draw
loadAndRender();

// Add resize event listener
d3.select(window).on("resize", renderSvg);

function loadAndRender() {
    d3.json(`processed-data/${timeFrame}-result.json`).then(function (data) {
        // Store data so that it can be filtered in case of slider change
        originalData = data;
        // Reset bounds if they were not changed
        if (lowerBound == minDate) lowerBound = undefined;
        if (upperBound == maxDate) upperBound = undefined;
        minDate = d3.min(originalData, (d) => new Date(d.date));
        maxDate = d3.max(originalData, (d) => new Date(d.date));
        filteredData = filterData(originalData);
        renderSvg();
    });
}

function renderSvg() {
    let svgWidth = container.node().clientWidth * 0.8;
    let svgHeight = container.node().clientHeight - headerHeight;
    svgChart.attr("width", svgWidth).attr("height", svgHeight);
    let chartWidth = svgWidth - margin.left - margin.right;
    let chartHeight = svgHeight - margin.top - margin.bottom - sliderHeight - notesHeight;

    // Add a clipPath so that everything out of this area won't be drawn.
    svgChart.selectAll("#clip").remove();
    svg.append("defs")
        .append("SVG:clipPath")
        .attr("id", "clip")
        .append("SVG:rect")
        .attr("width", chartWidth)
        .attr("height", chartHeight)
        .attr("x", 0)
        .attr("y", 0);

    xTicks = Math.floor(chartWidth / 75);
    xAxis.ticks(xTicks);
    yTicks = Math.floor(chartHeight / 50);
    yAxis.ticks(yTicks);
    xScale.range([0, chartWidth]);
    yScale.range([chartHeight, 0]);
    xAxisG.attr("transform", `translate(0,${chartHeight})`);

    svgChart.selectAll("text.dataset-source").remove();
    svg.append("text")
        .attr("class", "dataset-source")
        .html(
            "Dataset source: <a href='https://stooq.com/db/h/' target='_blank'>Stooq</a> & <a href='https://www.nasdaq.com/market-activity/stocks/screener' target='_blank'>Nasdaq</a>"
        )
        .attr("x", chartWidth)
        .attr("y", svgHeight - notesHeight - 22);
    svgChart.selectAll("text.source-code").remove();
    svg.append("text")
        .attr("class", "source-code")
        .html(
            "<a href='https://github.com/PedroCorreia105/LargestStockGrowthChart' target='_blank'>Source code: Github</a>"
        )
        .attr("x", chartWidth)
        .attr("y", svgHeight - notesHeight - 6);
    svgChart.selectAll("text.asterisk-note").remove();
    svg.append("text")
        .attr("class", "asterisk-note")
        .html("* Minimum open of $2 & average volume of 1000 shares.")
        .attr("x", 0)
        .attr("y", svgHeight - notesHeight - 6);

    renderChart(filteredData, chartWidth, chartHeight, 0);

    // Add the slider to the DOM
    svgChart.selectAll("g.slider").remove();
    svgChart
        .append("g")
        .attr("class", "slider")
        .attr("width", svgWidth)
        .attr("height", sliderHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${svgHeight - sliderHeight - notesHeight})`)
        .call(
            d3
                .sliderBottom()
                .min(minDate)
                .max(maxDate)
                .width(chartWidth)
                .tickFormat(d3.timeFormat("%Y %b"))
                .ticks(xTicks)
                .default([lowerBound || minDate, upperBound || maxDate])
                .fill("#0d7680")
                .on("end", (val) => {
                    lowerBound = val[0];
                    upperBound = val[1];

                    filteredData = filterData(originalData);
                    renderChart(filteredData, chartWidth, chartHeight, 750);
                })
        );
}

function renderChart(data, width, height, animationDuration) {
    d3.select("#tooltip").classed("hidden", true);
    // Update the scales with data domains
    xScale.domain(data.map((d) => d.date));
    yScale.domain([0, d3.max(data.map((d) => d.increase))]);

    // create a tick every tickStep
    const tickStep = Math.ceil(xScale.domain().length / xTicks);
    xAxis.tickValues(xScale.domain().filter((d, i) => xScale.domain().length < xTicks || i % tickStep === 0));

    // Update the x-axis
    xAxisG.attr("clip-path", "url(#clip)").transition().duration(animationDuration).call(xAxis);

    // Update the y-axis
    yAxisG.transition().duration(animationDuration).call(yAxis);

    // Hide the "0" tick label
    svg.selectAll(".y-axis .tick text")
        .filter((d) => d === 0)
        .style("display", "none");

    // Add horizontal gridlines
    svgChart.selectAll("line.horizontal-grid").remove();
    svg.selectAll("line.horizontal-grid")
        .data(yScale.ticks(yTicks))
        .enter()
        .append("line")
        .attr("class", "horizontal-grid")
        .attr("y1", (d) => yScale(d))
        .attr("x1", 0)
        .attr("y2", (d) => yScale(d))
        .attr("x2", width)
        .style("stroke", "gray")
        .style("stroke-width", 0.3)
        .style("stroke-dasharray", "3 3");

    // Add bars
    svg.selectAll(".bar")
        .raise()
        .data(data)
        .join(
            (enter) =>
                enter
                    .append("rect")
                    .attr("class", "bar")
                    .attr("x", (d) => xScale(d.date))
                    .attr("y", height)
                    .attr("width", xScale.bandwidth())
                    .attr("height", 0)
                    .style("opacity", 0),
            (update) => update,
            (exit) => exit.transition().duration(animationDuration).attr("y", height).attr("height", 0).remove()
        )
        .merge(svg.selectAll(".bar"))
        .attr("clip-path", "url(#clip)")
        .on("mouseover", handleMouseOver)
        .on("click", handleClick)
        .on("mouseout", handleMouseOut)
        .transition()
        .duration(2 * animationDuration)
        .ease(d3.easePolyOut.exponent(5))
        .attr("x", (d) => xScale(d.date))
        .attr("y", (d) => yScale(d.increase))
        .attr("width", xScale.bandwidth())
        .attr("height", (d) => height - yScale(d.increase))
        .attr("class", "bar")
        .style("opacity", 1);

    // Apply zoom to the svg
    const extent = [
        [0, 0],
        [width, height],
    ];
    zoomableArea
        .attr("width", width)
        .attr("height", height)
        .attr("x", 0)
        .attr("y", 0)
        .style("fill", "none")
        .style("pointer-events", "all")
        .call(
            d3
                .zoom()
                .scaleExtent([1, 15])
                .translateExtent(extent)
                .extent(extent)
                .on("zoom", (event) => handleZoom(event, width))
        );
}

function handleMouseOver(element, data) {
    d3.selectAll("#tooltip tr").remove();
    const svgLocation = svgChart.node().getBoundingClientRect();

    // Place the tooltip on the other half of the chart from where the hovered element is
    if (element.clientX > svgLocation.x + svgLocation.width / 2) {
        d3.select("#tooltip")
            .style("right", "unset")
            .style("left", `${svgLocation.x + 80}px`)
            .style("top", `${svgLocation.y + 50}px`);
    } else {
        d3.select("#tooltip")
            .style("left", "unset")
            .style("right", `${svgLocation.x + 80}px`)
            .style("top", `${svgLocation.y + 50}px`);
    }

    if (data.name) addTooltipLine("Company", `${data.name} (${data.ticker})`);
    else addTooltipLine("Ticker", data.ticker);
    addTooltipLine("Date", d3.timeFormat("%B %e, %Y")(new Date(data.date)));
    if (data.end_date) addTooltipLine("To", d3.timeFormat("%B %e, %Y")(new Date(data.end_date)));
    addTooltipLine("Opened at", "$" + data.open.toFixed(2));
    addTooltipLine("Closed at", "$" + data.close.toFixed(2));
    addTooltipLine("Increase", data.increase.toLocaleString(undefined, { maximumFractionDigits: 2 }) + "%");
    addTooltipLine(`Total ${timeFrame} volume`, data.volume.toLocaleString(undefined, { maximumFractionDigits: 0 }));
    if (data.average_volume) {
        addTooltipLine(
            `Average ${timeFrame} volume`,
            data.average_volume.toLocaleString(undefined, { maximumFractionDigits: 0 })
        );
    }
    addTooltipLine("Country", data.country);
    addTooltipLine("Sector", data.sector);
    addTooltipLine("Industry", data.industry);
    if (data.marketCap) addTooltipLine("Current market cap", "$" + data.marketCap.toLocaleString());

    d3.select("#tooltip").classed("hidden", false);

    d3.select(element.target).classed("highlight", true);
}

function addTooltipLine(category, value) {
    if (value) {
        const tr = d3.select("#tooltip").append("tr");
        tr.append("td").attr("class", "category").text(category);
        tr.append("td").attr("class", "value").text(value);
    }
}

function handleMouseOut(element) {
    d3.select(element.target).classed("highlight", false);
}

function handleClick(event, data) {
    let start_date = new Date(data.date);
    let end_date = new Date(data.date);
    if (data.end_date) end_date = new Date(data.end_date);

    // Show a 3 days before and after
    start_date = new Date(start_date.getTime() - 3 * 24 * 60 * 60 * 1000);
    end_date = new Date(end_date.getTime() + 3 * 24 * 60 * 60 * 1000);

    // Convert to yahoo finance format
    start_date = Math.floor(start_date.getTime() / 1000);
    end_date = Math.floor(end_date.getTime() / 1000);

    const url = `https://finance.yahoo.com/quote/${data.ticker}/history?period1=${start_date}&period2=${end_date}`;
    window.open(url, "_blank");
}

function handleZoom(event, width) {
    xScale.range([0, width].map((d) => event.transform.applyX(d)));

    // Re-scale the bars
    svg.selectAll("rect.bar")
        .attr("x", (d) => xScale(d.date))
        .attr("width", xScale.bandwidth());

    // Re-scale the axis
    svg.select(".x-axis").call(xAxis);
}

function switchTimeFrame() {
    if (canBeSwitched) {
        canBeSwitched = false;
        const timeframeContainer = document.querySelector("div#timeframe-container");
        const firstOption = timeframeContainer.firstElementChild;
        timeframeContainer.appendChild(firstOption.cloneNode(true)); // Clone the first option and append it

        timeframeContainer.style.transform = "translateY(-50px)";
        timeframeContainer.style.transition = "transform 0.5s ease";

        new Promise((resolve) => setTimeout(resolve, 500)).then(() => {
            timeframeContainer.removeChild(firstOption);
            // Reset the transform immediately to prevent visible jump
            timeframeContainer.style.transition = "none";
            timeframeContainer.style.transform = "translateY(0)";

            // Force reflow to apply styles immediately
            timeframeContainer.offsetHeight;

            // Re-enable transition for future animations
            timeframeContainer.style.transition = "transform 0.5s ease";

            timeFrame = timeframeContainer.firstElementChild.classList[1];
            loadAndRender();
            canBeSwitched = true;
        });
    }
}

function filterData(data) {
    return data.filter(
        (d) => new Date(d.date) >= (lowerBound || minDate) && new Date(d.date) <= (upperBound || maxDate)
    );
}
