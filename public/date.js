function dateToStr(date) {
  return date.format('YYYY-MM-DD');
}

function isSameDay(d1, d2) {
  return d1.year() === d2.year() &&
    d1.month() === d2.month() &&
    d1.date() === d2.date();
}

function secondInDay(datetime) {
  const hourToSec = datetime.hour() * 3600;
  const minToSec = datetime.minute() * 60;
  const secToSec = datetime.second();
  return hourToSec + minToSec + secToSec;
}

function addDay(date, numDays) {
  date.add(numDays, 'days');
}

function inDays(date, startDay, numDays) {
  const firstDay = moment(startDay);
  const lastDay = moment(startDay).add(numDays, 'days');
  return date.isBetween(firstDay, lastDay);
}

const totalSecOfDay = 86400;

export {
  dateToStr,
  inDays,
  addDay,
  isSameDay,
  secondInDay,
  totalSecOfDay,
};
