import {
  dateToStr,
} from './date';

function groupDataInDays(data) {
  const organizedData = {};

  const day = moment(data[0].time);
  day.hour(0);
  day.minute(0);
  day.second(0);
  day.millisecond(0);
  while (day < data[data.length - 1].time) {
    const dayStr = dateToStr(day);
    organizedData[dayStr] = {
      date: dayStr,
      events: [],
    };
    day.add(1, 'days');
  }

  data.forEach((d) => {
    const date = moment(d.time);
    const dateStr = dateToStr(date);
    organizedData[dateStr].events.push(d);
  });

  return organizedData;
}

function getDataInDays(allData, start, numDays) {
  const data = [];
  const day = moment(start);
  for (let i = 0; i < numDays; i += 1) {
    const dayStr = dateToStr(day);
    const dayData = allData[dayStr];
    if (dayData !== undefined) {
      data.push(allData[dayStr]);
    }
    day.add(1, 'days');
  }
  return data;
}

function preprocessGlucoseData(data) {
  let filteredData = data;
  filteredData = filteredData.filter(d => d.source === 'nightscout');
  filteredData.forEach((d) => {
    const entry = d;
    entry.time = moment(entry.time);
    entry.value = parseFloat(entry.glucoseReading);
  });

  const glucoseOrgData = groupDataInDays(filteredData);
  const firstData = filteredData[0];
  const lastData = filteredData[filteredData.length - 1];

  return { glucoseOrgData, firstData, lastData };
}

function preprocessEventData(data) {
  data.forEach((d) => {
    const entry = d;
    entry.time = moment(entry.time);
    entry.Humalog = parseFloat(entry.Humalog);
    entry.Glucose = parseFloat(entry.Glucose);
    entry.MealCarbs = parseFloat(entry.MealCarbs);
  });

  return groupDataInDays(data);
}

function preprocessBasalData(data) {
  data.forEach((d) => {
    const entry = d;
    entry.time = moment(entry.deviceTime);
    entry.Rate = parseFloat(entry.Rate);
    entry.duration = parseFloat(entry.duration);
    entry.amount = parseFloat(entry.amount);
  });
  const orgData = groupDataInDays(data);
  return orgData;
}

function preprocessBolusData(data) {
  data.forEach((d) => {
    const entry = d;
    entry.time = moment(entry.deviceTime);
    entry.normal = parseFloat(entry.normal);
  });

  const orgData = groupDataInDays(data);
  const days = Object.keys(orgData);
  days.forEach((day) => {
    const dayData = orgData[day];
    dayData.dayBolus = dayData.events.reduce(
      (sum, item) => sum + item.normal,
      0,
    );
  });

  return orgData;
}

export {
  getDataInDays,
  preprocessBasalData,
  preprocessBolusData,
  preprocessEventData,
  preprocessGlucoseData,
};
