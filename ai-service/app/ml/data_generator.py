from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List, Optional
import numpy as np
import pandas as pd


def generate_synthetic_demand(
    product_ids: Optional[List[int]] = None,
    warehouse_ids: Optional[List[int]] = None,
    days: int = 180,
    end_date: Optional[date] = None,
    random_seed: int = 42,
) -> pd.DataFrame:
    """Generate realistic inventory transaction/demand time-series data.

    Simulates daily outgoing demand for products across warehouses with:
    - Base demand per product category/ID
    - Weekly seasonality (higher demand around weekends / mid-week)
    - Trend and random fluctuations
    """
    if product_ids is None:
        product_ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    if warehouse_ids is None:
        warehouse_ids = [1, 2, 3]
    if end_date is None:
        end_date = date.today()

    np.random.seed(random_seed)
    start_date = end_date - timedelta(days=days - 1)
    dates = [start_date + timedelta(days=i) for i in range(days)]

    records = []
    for pid in product_ids:
        # Base product daily volume between 10 and 60 units
        base_volume = 10.0 + (pid * 4.5) % 45
        trend_slope = ((pid % 5) - 2) * 0.03  # slight positive or negative trend

        for wid in warehouse_ids:
            warehouse_multiplier = 0.8 + (wid * 0.15)

            for t_idx, d in enumerate(dates):
                # Day of week effect: Saturday/Sunday differ from weekdays
                dow = d.weekday()  # Monday is 0, Sunday is 6
                weekend_factor = 1.35 if dow in (4, 5) else (0.85 if dow == 6 else 1.0)

                # Month factor: slight bump in Q4 / end of month
                month_factor = 1.1 if d.month in (11, 12) else 1.0
                payday_factor = 1.25 if d.day in (15, 30, 31) else 1.0

                trend = 1.0 + (trend_slope * (t_idx / max(days, 1)))
                noise = np.random.normal(0, max(2.0, base_volume * 0.12))

                demand = (
                    base_volume
                    * warehouse_multiplier
                    * weekend_factor
                    * month_factor
                    * payday_factor
                    * trend
                    + noise
                )
                demand = max(0.0, round(demand, 1))

                records.append(
                    {
                        "date": d.isoformat(),
                        "product_id": pid,
                        "warehouse_id": wid,
                        "demand": demand,
                    }
                )

    df = pd.DataFrame(records)
    df["date"] = pd.to_datetime(df["date"])
    return df.sort_values(by=["product_id", "warehouse_id", "date"]).reset_index(drop=True)


def load_or_create_dataset(csv_path: Path, days: int = 180) -> pd.DataFrame:
    """Load historical demand from CSV if present, otherwise generate and save it."""
    if csv_path.exists():
        try:
            df = pd.read_csv(csv_path)
            df["date"] = pd.to_datetime(df["date"])
            return df
        except Exception:
            pass

    csv_path.parent.mkdir(parents=True, exist_ok=True)
    df = generate_synthetic_demand(days=days)
    df.to_csv(csv_path, index=False)
    return df
