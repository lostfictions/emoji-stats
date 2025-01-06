-- @param {String} $1:guildId
-- @param {Int} $2:startDate The start of the time range, as Unix epoch
-- @param {Int} $3:endDate The end of the time range, as Unix epoch

-- note that we group by date here, which can lead to inconsistencies since
-- everything is in UTC (eg. emoji usages may be bucketed into future dates).
-- strftime() accepts an offset, but there's no easy way to get the client's
-- timezone when it requests a page (we could send it along as a header or
-- param in an api request, but not a page request).
-- rather than doing elaborate bookkeeping to make this work, let's...
-- somewhat arbitrarily set this to PST. EDT users' messages posted up until
-- 4am will be bucketed to the previous day, which is fine. the real issue is
-- for people outside the Americas... sorry folks, maybe i'll fix this
-- someday.
SELECT
  strftime('%F', ROUND(date / 1000), 'unixepoch', '-08:00') day,
  id,
  name,
  count(1) count
FROM EmojiUsage u, Emoji e
WHERE
  u.emojiId = e.id
  AND guildId = $1
  AND date > $2
  AND date < $3
GROUP BY emojiId, day
ORDER BY day ASC, count DESC;