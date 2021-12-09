const inHgPerPa = 0.0002953;
const inPerMeter = 39.3701;
const HOME_LOC = "38.6270074,-90.1912848";
const hourFormat = { weekday: 'short', hour: 'numeric' };
const dowFormat = { weekday: 'short' };
const hourOnlyFormat = { hour: 'numeric' };
const hourMinFormat = { weekday: 'short', hour: 'numeric', minute: 'numeric' };
const geoHeaders = { headers: { "accept": "application/geo+json" } };
const geoOptions = { maximumAge: 5 * 60 * 1000, timeout: 5 * 1000 };

class HourGrid {
    forecast;

    constructor(forecast) {
        this.forecast = forecast;
    }

    * dayOffs() {
        for (var result = 0; result < this.forecast.length; result += 24) yield result;
        yield this.forecast.length - 1;
    }

    offset = (-1) * new Date(this.forecast[0].startTime).getHours();

    findNdx(day, hour) { return (day * 24) + hour; }

    getHour(day, hour) {
        let forecastNdx = this.offset + this.findNdx(day, hour);
        return (forecastNdx > -1 && forecastNdx < forecast.length) ?
            { 'day': day, 'hour': hour, foreNdx: forecastNdx, ...forecast[forecastNdx] } :
            { 'day': day, 'hour': hour, foreNdx: forecastNdx };
    }

    getDayNames() {
        return [...this.dayOffs()].map(x => formatDate(new Date(forecast[x].startTime), dowFormat)).filter((v, i, a) => i == 0 || a[i - 1] !== a[i]);
    }

    * getAllDays() {
        for (var day = 0; day < 8; day++)
            for (var hour = 0; hour < 24; hour++)
                yield this.getHour(day, hour);
    }

    getHourNames() {
        const result = [];
        for (var hour = 0; hour < 24; hour++)
            result.push(formatDate(new Date(this.getHour(1, hour).startTime), hourOnlyFormat).toLowerCase());
        return result;
    };
}

const buildDayLabel = (day, ndx, gridSize) => {
    const result = document.createElementNS("http://www.w3.org/2000/svg", "text");
    result.setAttribute("x", gridSize / 2);
    result.setAttribute("y", (ndx + 1.5) * gridSize);
    result.setAttribute("class", "dow");
    result.appendChild(document.createTextNode(day));
    return result;
};

const buildHourLabel = (hour, ndx, gridSize) => {
    const result = document.createElementNS("http://www.w3.org/2000/svg", "text");
    result.setAttribute("x", (ndx + 1.5) * gridSize);
    result.setAttribute("y", gridSize / 2);
    result.setAttribute("class", "label");
    result.appendChild(document.createTextNode(hour));
    return result;
};

const buildCell = (forecast, ndx, gridSize) => {
    const coords = new String(forecast.day).padStart(2, '0') + "," + new String(forecast.hour).padStart(2, '0');
    const imgTag = document.createElementNS("http://www.w3.org/2000/svg", "image");
    const eventHandler = "toggleText('" + coords + "')"
    imgTag.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', forecast.icon);
    imgTag.setAttribute("x", (forecast.hour + 1) * gridSize);
    imgTag.setAttribute("y", (forecast.day + 1) * gridSize);
    imgTag.setAttribute("class", "hour bordered");
    imgTag.setAttribute("width", gridSize);
    imgTag.setAttribute("height", gridSize);
    imgTag.setAttribute("rx", 4);
    imgTag.setAttribute("ry", 4);
    imgTag.setAttribute("id", "img" + coords);
    imgTag.setAttribute("onmouseover", eventHandler);
    imgTag.setAttribute("onmouseout", eventHandler);
    imgTag.setAttribute("ontouchstart", eventHandler);
    imgTag.setAttribute("ontouchend", eventHandler);

    const textX = (forecast.hour + 1.5) * gridSize
    const forecastTag = document.createElementNS("http://www.w3.org/2000/svg", "text");
    forecastTag.setAttributeNS(null, "x", textX);
    forecastTag.setAttributeNS(null, "y", (forecast.day + 1.5) * gridSize);
    forecastTag.setAttribute("id", "forecast" + coords);
    forecastTag.setAttribute("onmouseover", eventHandler);
    forecastTag.setAttribute("onmouseout", eventHandler);
    forecastTag.setAttribute("class", "label");
    forecastTag.setAttribute("style", "display: none;");
    forecastTag.appendChild(document.createTextNode(forecast.shortForecast));

    const tempTag = document.createElementNS("http://www.w3.org/2000/svg", "text");
    tempTag.setAttributeNS(null, "x", textX);
    tempTag.setAttributeNS(null, "y", (forecast.day + 1.75) * gridSize);
    tempTag.setAttribute("id", "temp" + coords);
    tempTag.setAttribute("onmouseover", eventHandler);
    tempTag.setAttribute("onmouseout", eventHandler);
    tempTag.setAttribute("class", "label");
    tempTag.appendChild(document.createTextNode(forecast.temperature));

    return [imgTag, forecastTag, tempTag];
};

const compTag = (l, r) => (l.tagName < r.tagName) ? -1 : (l.tagName > r.tagName) ? 1 : (l.id < r.id) ? -1 : (l.id > r.id) ? 1 : 0;

const buildSvgTag = (foreGrid, topOffset) => {
    const gridSize = Math.floor(window.innerWidth / 26);
    const result = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    result.setAttribute("width", window.innerWidth);
    result.setAttribute("height", window.innerHeight - topOffset);
    result.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    result.setAttribute('xmlns', "http://www.w3.org/2000/svg");
    const styleTag = document.createElementNS("http://www.w3.org/2000/svg", "style");
    styleTag.appendChild(document.createTextNode(".dow { text-anchor: end; fill: white; font: 12px sans-serif; } .label { text-anchor: middle; fill: white; font: 12px sans-serif; }"));
    result.appendChild(styleTag);
    const allElems = [];
    foreGrid.getDayNames().map((x, ndx) => buildDayLabel(x, ndx, gridSize)).forEach(x => allElems.push(x));
    foreGrid.getHourNames().map((x, ndx) => buildHourLabel(x, ndx, gridSize)).forEach(x => allElems.push(x));
    [...foreGrid.getAllDays()].filter(x => x.shortForecast).map((x, ndx) => buildCell(x, ndx, gridSize)).forEach(x => x.forEach(cell => allElems.push(cell)));
    allElems.sort(compTag).forEach(x => result.appendChild(x));
    return result;
};

const heatmapChart = (chartId, forecast, topOffset) => document.getElementById(chartId).appendChild(buildSvgTag(new HourGrid(forecast), topOffset));

const getDateString = (date, dateFormat) => new Intl.DateTimeFormat('en-US', dateFormat).format(date);

const formatDate = (date, dateFormat = hourFormat) => (date instanceof Date) ? getDateString(date, dateFormat) : date;

const getDateRange = (start, end) => formatDate(start) + " to " + formatDate(end);

const getDate = strDate => new Date(strDate);

const getWind = period => period.windDirection + " " + period.windSpeed;

const parseForecast = forecast => {
    if (forecast.properties && forecast.properties.periods) {
        heatmapChart("searchResults", forecast.properties.periods, getTopOffset('#conditionsBox'));
    }
};

const formattedNum = x => Number.parseFloat(x).toFixed(2);

const getFarenheit = x => (x * 9 / 5) + 32;

const setText = (tag, text) => document.getElementById(tag).innerText = text;

const getWindChill = windChill => (windChill < 31) ? ", " + windChill + "F wind chill" : "";

const getConditionsText = (desc, temp, windChill) => desc + ", " + temp + "F degrees" + getWindChill(windChill);

const setImage = imgSrc => document.body.style.backgroundImage = "url(" + imgSrc + ")";

const getInches = meters => meters * inPerMeter;

const formatPrecipitation = properties => {
    var result = "";
    if (properties.precipitationLastHour.value) {
        result += formattedNum(getInches(properties.precipitationLastHour.value)) + "in precipitation in past hour";
    }
    if (properties.precipitationLast3Hours.value) {
        if (result) result += ", ";
        result += formattedNum(getInches(properties.precipitationLast3Hours.value)) + "in precipitation in past 3 hours";
    }
    if (properties.precipitationLast6Hours.value) {
        if (result) result += ", ";
        result += formattedNum(getInches(properties.precipitationLast6Hours.value)) + "in precipitation in past 6 hours";
    }
    return result;
};

const getTopOffset = (...locAbove) => locAbove.map(x => document.querySelector(x).offsetHeight).reduce((acc, curr) => acc + curr, 15);

const parseConditions = conditions => {
    if (conditions.properties && conditions.properties.barometricPressure &&
        conditions.properties.barometricPressure.value) {
        const inHg = conditions.properties.barometricPressure.value * inHgPerPa;
        setText("barometricPressure", formattedNum(inHg) + " inches Hg, " +
            formattedNum(conditions.properties.relativeHumidity.value) + "% relative humidity");

        const windChill = formattedNum(getFarenheit(conditions.properties.windChill.value));
        const currTemp = formattedNum(getFarenheit(conditions.properties.temperature.value));
        const desc = conditions.properties.textDescription;
        setText("currTemp", getConditionsText(desc, currTemp, windChill));

        setText("currTime", formatDate(getDate(conditions.properties.timestamp), hourMinFormat));

        setText("precipitation", formatPrecipitation(conditions.properties));

        setImage(conditions.properties.icon.replace("medium", "large"));

        document.querySelector('#alerts').style.top = getTopOffset('#conditionsBox') + "px";
        document.querySelector('#searchResults').style.top = getTopOffset('#conditionsBox', '#alerts') + "px";
    }
};

const startCall = (url, callback) => fetch(url, geoHeaders).then(response => response.json()).then(callback);

const getPosition = callback => {
    const enteredLoc = document.getElementById("currLocation").value;
    const DEF_LOC = (enteredLoc) ? enteredLoc : HOME_LOC;
    if (!enteredLoc && ('geolocation' in navigator || navigator.geolocation)) {
        navigator.geolocation.getCurrentPosition(x => callback(x.coords.latitude + "," + x.coords.longitude),
            err => callback(DEF_LOC), geoOptions);
    } else {
        callback(DEF_LOC);
    }
};

const getDistance = (here, far) => Math.sqrt(Math.pow((here[0] - far[0]), 2) + Math.pow((here[1] - far[1]), 2));

const compDist = (l, r) => (l.dist < r.dist) ? -1 : (l.dist > r.dist) ? 1 : 0;

const getClosestStation = (pos, stations) =>
    stations
        .map(x => ({ src: x, dist: getDistance(pos, x.geometry.coordinates) }))
        .sort(compDist)
        .map(x => x.src);

const loadOption = (opt, { geometry: { coordinates: [long, lat] }, properties: { name: statName } }) => {
    opt.value = lat + "," + long;
    opt.text = statName;
    return opt;
};

const buildOption = station => loadOption(document.createElement("option"), station);

const buildAlternates = distStations => {
    var locs = document.getElementById("locations");
    if (locs.options.length) Array.from(Array(locs.options.length)).forEach(x => locs.remove(0));
    distStations.map(buildOption).forEach(opt => locs.add(opt, null));
};

const getMyConditions = srcPos =>
    stations => {
        const distStations = getClosestStation(srcPos, stations.features);
        buildAlternates(distStations);
        startCall("https://api.weather.gov/stations/" + distStations[0].properties.stationIdentifier + "/observations/latest", parseConditions);
    };

const buildAlertText = features => features.map(f => f.properties.description.replace(/(\r\n|\n|\r)/gm, " ").trim()).join("<BR>");

const parseAlerts = alerts => {
    setText("alerts",
        (alerts.features && alerts.features.length) ? buildAlertText(alerts.features) : '');
    document.querySelector('#searchResults').style.top = getTopOffset('#conditionsBox', '#alerts') + "px";
};

const findZone = forecastZone => forecastZone.substring(forecastZone.lastIndexOf("/") + 1);

const getForecastByOffice = ptOffice => {
    startCall(ptOffice.properties.forecastHourly, parseForecast);
    startCall("https://api.weather.gov/alerts/active?zone=" + findZone(ptOffice.properties.forecastZone), parseAlerts);
}

const findStationByPosition = pos => {
    document.getElementById("currLocation").value = pos;
    startCall("https://api.weather.gov/points/" + pos + "/stations", getMyConditions(pos.split(",").reverse()));
    startCall("https://api.weather.gov/points/" + pos, getForecastByOffice);
};

const getStation = () => {
    document.getElementById("searchResults").innerText = '';
    getPosition(findStationByPosition);
};

const useSelectedLocation = x => {
    document.getElementById("currLocation").value = document.getElementById("locations").value;
    getStation();
};

const negateDisplay = display => (display === 'block') ? 'none' : 'block';

const toggleText = cell => document.getElementById('forecast' + cell).style.display = negateDisplay(document.getElementById('forecast' + cell).style.display);

window.onload = () => {
    document.querySelector('#refresh').addEventListener('click', getStation);
    document.querySelector('#currLocation').addEventListener('change', getStation);
    document.getElementById("locations").addEventListener('change', useSelectedLocation);
    getStation();
};
