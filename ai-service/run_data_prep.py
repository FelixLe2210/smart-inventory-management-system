"""Chạy toàn bộ Sprint 7 – M1: python run_data_prep.py [--source csv --input ... --map ...]"""
import sys
from data_prep import s01_collect_sales_dataset as s01, s02_clean_data as s02, s03_eda as s03, s04_prepare_training_dataset as s04

if __name__ == "__main__":
    s01.main(sys.argv[1:])
    s02.main()
    s03.main()
    s04.main([])
