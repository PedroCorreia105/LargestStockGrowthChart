<p align="center">
  <a href="https://d3js.org/" target="blank"><img src="https://raw.githubusercontent.com/d3/d3-logo/master/d3.png" width="150" alt="D3.js Logo" /></a>
</p>

<p align="center">
  <a href="https://github.com/prettier/prettier"><img src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?" alt="code style: prettier"></a>
  <a href="https://www.codefactor.io/repository/github/pedrocorreia105/largeststockgrowthchart/overview/master"><img src="https://www.codefactor.io/repository/github/pedrocorreia105/largeststockgrowthchart/badge/master" alt="CodeFactor" /></a>
  <a href="https://largeststockgrowthchart.netlify.app/"><img src="https://img.shields.io/website?url=https%3A%2F%2Flargeststockgrowthchart.netlify.app" alt="Website"></a>
  <a href="https://github.com/PedroCorreia105/LargestStockGrowthChart/blob/master/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green" alt="License"></a>
</p>

<p align="center">
  <sub><sup>
    <a href="#description">Description</a> •
    <a href="#stack">Stack</a> •
    <a href="#dependencies">Dependencies</a> •
    <a href="#commands">Commands</a> •
    <a href="#video-tutorials">Video Tutorials</a> •
    <a href="#license">License</a>
  </sub></sup>
</p>

## Description

A responsive visualization made with D3.js of the largest stock growth by month, week and day of US stocks in the past 60 years.
Displayed stocks have a minimum open of $2, average volume of 1000 shares and traded for at least 10 days.

## Stack

<table align="center">
  <tr>
    <td align="right">
      <b>Dataset source</b>
    </td>
    <td align="left">
      <a href="https://stooq.com/db/h/">Stooq</a> & 
      <a href="https://www.nasdaq.com/market-activity/stocks/screener">Nasdaq</a>
    </td>
  </tr>
  <tr>
    <td align="right">
      <b>Processed with</b>
    </td>
    <td align="left">
      <a href="https://nestjs.com/">JS</a>
    </td>
  </tr>
  <tr>
    <td align="right">
      <b>Graph Library</b>
    </td>
    <td align="left">
      <a href="https://www.postgresql.org/">D3</a>
    </td>
  </tr>
  <tr>
    <td align="right">
      <b>Deployment</b>
    </td>
    <td align="left">
      <a href="https://netlify.com/">Netlify</a>
    </td>
  </tr>
 </table>

## Dependencies

```bash
$ npm install cli-progress live-server
```

## Commands

```bash
# Process data
$ node ./process_data.js

# Display chart
$ npx live-server
```

## Video Tutorials

-   [DataVizDad](https://www.youtube.com/@datavizdad)
-   [Data Science for Everyone - D3: Data Driven Documents](https://www.youtube.com/watch?v=lzxAKqoBhDY&list=PLlbbWgBRF8EfU-MZNicdIGVKMIX-6krG8&index=1)

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/PedroCorreia105/LargestStockGrowthChart/blob/master/LICENSE) file for details.
