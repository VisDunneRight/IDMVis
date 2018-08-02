import {
  dateToStr,
} from './date';

import {
  preprocessEventData, getDataInDays,
} from './data';

function numberToTableStr(number) {
  if (Number.isNaN(number)) {
    return ' - ';
  }
  return number.toFixed(1);
}

function glucoseLevelToColor(glucose) {
  if (glucose > 200) return '#ffbb51';
  if (glucose > 70) return '#73b985';
  if (glucose > 0) return '#ff6567';
  return '#999999';
}

function tabulate(allData, start, numDays) {
  const data = getDataInDays(allData, start, numDays);
  console.log(data);

  const table = $('#day-by-meal-table').find('tbody');
  table.html('');

  data.forEach((day) => {
    const row = $('<tr></tr>');
    table.append(row);

    row.append($(`<td class="date4Table">${day.date}</td>`));
    row.append($(`<td>${numberToTableStr(day.breakfast.insulin)}</td>`));
    row.append($(`<td>${numberToTableStr(day.breakfast.carbs)}</td>`));
    row.append($(`<td class="glucose4Table" style="color:${glucoseLevelToColor(day.breakfast.glucose)};">${numberToTableStr(day.breakfast.glucose)}</td>`));
    row.append($(`<td >${numberToTableStr(day.lunch.insulin)}</td>`));
    row.append($(`<td>${numberToTableStr(day.lunch.carbs)}</td>`));
    row.append($(`<td class="glucose4Table" style="color:${glucoseLevelToColor(day.lunch.glucose)};">${numberToTableStr(day.lunch.glucose)}</td>`));
    row.append($(`<td>${numberToTableStr(day.dinner.insulin)}</td>`));
    row.append($(`<td>${numberToTableStr(day.dinner.carbs)}</td>`));
    row.append($(`<td class="glucose4Table" style="color:${glucoseLevelToColor(day.dinner.glucose)};">${numberToTableStr(day.dinner.glucose)}</td>`));
    row.append($(`<td>${numberToTableStr(day.bedtime.insulin)}</td>`));
    row.append($(`<td>${numberToTableStr(day.bedtime.carbs)}</td>`));
    row.append($(`<td style="color:${glucoseLevelToColor(day.bedtime.glucose)};">${numberToTableStr(day.bedtime.glucose)}</td>`));
  });
}

function getTimeSpan() {
  const start = moment('2017-08-23');
  const end = moment('2017-09-05');
  $('#start-date').attr({
    min: dateToStr(start),
    max: dateToStr(end),
  });

  $('#end-date').attr({
    min: dateToStr(start),
    max: dateToStr(end),
  });
  return start;
}

const numDays = 14;
let startDate;
let data;

function getStartDateFromDom() {
  const startDaySelector = $('#start-date');
  const start = moment(startDaySelector.val());
  return start;
}

function updateDateDisplay(start) {
  const end = moment(start);
  end.add(numDays, 'days');
  $('#start-date').val(dateToStr(start));
  $('#end-date').val(dateToStr(end));
}

function oneDayBackward() {
  const start = getStartDateFromDom();
  start.subtract(1, 'days');
  updateDateDisplay(start);
  tabulate(data, start, numDays);
}

function oneDayForward() {
  const start = getStartDateFromDom();
  start.add(1, 'days');
  updateDateDisplay(start);
  tabulate(data, start, numDays);
}

function updateStartDate() {
  const start = getStartDateFromDom();
  // updateDateDisplay(start);
  tabulate(data, start, numDays);
}

function getMealSummary(dayEvents, meal) {
  let mealSummary = {
    insulin: 0,
    glucose: NaN,
    carbs: 0,
  };
  const mealEvents = dayEvents.filter(event => event.Meal === meal);
  mealSummary = mealEvents.reduce((summary, breakfast) => {
    const info = summary;

    info.insulin += breakfast.Humalog;

    if (Number.isNaN(info.glucose)) {
      info.glucose = breakfast.Glucose;
    }

    info.carbs += breakfast.MealCarbs;
    return info;
  }, mealSummary);

  if (mealEvents.length === 0) {
    return {
      insulin: NaN,
      glucose: NaN,
      carbs: NaN,
    };
  }

  return mealSummary;
}

function getMealInformation(events) {
  const eventsData = events;
  Object.keys(events).forEach((day) => {
    const eventsOfDay = eventsData[day].events;

    eventsData[day].breakfast = getMealSummary(eventsOfDay, 'Breakfast');
    eventsData[day].lunch = getMealSummary(eventsOfDay, 'Lunch');
    eventsData[day].dinner = getMealSummary(eventsOfDay, 'Dinner');
    eventsData[day].bedtime = getMealSummary(eventsOfDay, 'Bedtime snack');
  });
}

d3.csv('event.csv', (events) => {
  data = events;

  data = preprocessEventData(data);
  getMealInformation(data);

  $('#prev-day').click(oneDayBackward);
  $('#next-day').click(oneDayForward);
  $('#start-date').change(updateStartDate);

  startDate = getTimeSpan();
  updateDateDisplay(startDate);
  tabulate(data, startDate, numDays);
});
