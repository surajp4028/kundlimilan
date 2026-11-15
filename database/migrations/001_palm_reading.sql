-- Palm reading (AstrologyAPI Palmistry): photo-based report delivered by webhook.
ALTER TABLE services MODIFY category ENUM('kundli','matching','yearly','numerology','remedies','western','palmistry') NOT NULL DEFAULT 'kundli';
ALTER TABLE services MODIFY input_kind ENUM('single','couple','single_year','palm') NOT NULL DEFAULT 'single';
-- 'waiting' = provider accepted the job; the PDF arrives later on our webhook
ALTER TABLE orders MODIFY report_status ENUM('not_started','generating','waiting','ready','failed') NOT NULL DEFAULT 'not_started';
ALTER TABLE orders ADD COLUMN report_request_id VARCHAR(64) NULL AFTER report_started_at, ADD KEY idx_orders_report_req (report_request_id);
