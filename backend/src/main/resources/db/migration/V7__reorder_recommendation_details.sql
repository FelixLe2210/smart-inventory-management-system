-- Sprint 9/10: keep the AI #2 explanation next to the recommendation.
-- details_json holds the full /api/reorder/recommend response (reasons, assumptions, warnings...).
ALTER TABLE dbo.reorder_recommendations
    ADD shortage_risk NVARCHAR(10) NULL,
        stockout_probability DECIMAL(5,4) NULL,
        avg_daily_demand DECIMAL(12,2) NULL,
        expected_arrival_date DATE NULL,
        details_json NVARCHAR(MAX) NULL;
