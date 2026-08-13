"""
Run once to seed the database with default data:
  python seed.py

Safe to re-run — skips existing entries.
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine, Base
import models  # registers all models

from core.security import hash_password
from models.user import User
from models.config_item import ConfigItem

Base.metadata.create_all(bind=engine)

EXPENSE_CATEGORIES = [
    "BLR HomeLoanEMI", "BLR Home Maintainance", "BLR Home electricity",
    "BLR Home internet", "BLR Home Gas", "Office lane Home internet",
    "Office lane Home Gas", "Office Lane Home Maintainance", "Office lane Home electricity",
    "Car Loan EMI", "Car Petrol", "Car Maintainace", "Car insuarnce", "Car Wash",
    "Bike insurance", "Bike Maintainace", "Airtel postpaid", "Vodafone prepaid",
    "Grocery:Food expense", "Grocery:Non food items", "Cigerrate", "Shopping",
    "OTT platforms", "SBI Credit Card", "IDFC Credit Card", "ICIC Credit Card",
    "HDFC Credit Card", "Extra", "Games", "Grooming", "Medicines",
    "Ramnagar Home Maintainance", "Office lane Home Property Tax", "BLR Home Property Tax",
    "ITR Payment", "ITR Service",
    "Negative Adjustment(Loan From Future me)", "Positive Adjustment(Loan from Past me)",
    "Swiggy/Zomato/OutsideFood", "Bike Petrol", "Investment", "Tea",
    "OLA/UBer/Bus/Rapido/Taxi/Flight", "Aquirium", "Plants", "Entertainment",
    "BLR Society Maintainance", "BLR Society CIF", "Income tax challan",
    "Income tax auditor charge", "Bike Wash", "Scooty Wash", "Office Lane Static IP",
    "BLR Static IP", "OTT Platform zee5", "OTT Platform Youtube",
    "OTT Platform AmazonPrime", "OTT Platform NetFlix", "OTT Platform SpnyLive",
    "OTT Platform Hotstar", "OTT Platform jio cenema", "OTT Platform Googleone",
    "OTT Platform True caller", "Scooty petrol", "Scooty Insurance",
    "Personal Loan:SBI", "Personal Loan:HDFC", "Personal Loan:PNB",
    "IndusInd Credit Card", "Scooty Maintainence",
]

CREDIT_CARDS = [
    "SBI Credit Card", "IDFC Credit Card", "ICIC Credit Card",
    "HDFC Credit Card", "IndusInd Credit Card",
]

MONTHLY_MUST = [
    "BLR HomeLoanEMI", "BLR Home Maintainance", "BLR Home electricity",
    "BLR Home internet", "Office lane Home internet", "Office lane Home electricity",
    "Car Loan EMI", "Car Petrol", "Grocery:Food expense", "Medicines",
]

TOTALLY_ESSENTIAL = [
    "BLR HomeLoanEMI", "BLR Home Maintainance", "BLR Home electricity",
    "BLR Home internet", "BLR Society Maintainance", "BLR Home Property Tax",
    "BLR Home Gas", "Car Loan EMI", "Car Petrol", "Car Maintainace", "Car insuarnce",
    "Scooty petrol", "Scooty Insurance", "Vodafone prepaid", "Medicines",
    "Grocery:Food expense", "Office lane Home internet", "Office lane Home electricity",
    "Office lane Home Property Tax", "Scooty Maintainence", "Bike Maintainace", "Bike insurance",
]

ASSET_CATEGORIES = ["Cash", "Equities", "Real Estates", "Pension", "Vehicles", "Metal"]

ASSET_HOLDERS = [
    "HDFC SAL", "HDFC PL", "PNB 70", "PNB 21", "SBI",
    "Zerodha", "HEM Securities", "NIPPON", "EPFO",
]

ASSET_SUB_CATEGORIES = [
    "Emergency Funds", "Savings Account", "Stock Portfolio", "Mutual Funds",
    "Gold", "Silver", "Fixed Deposit", "Providant Funds", "Mutual Funds-MultiCap",
]

IGNORE_CATEGORIES = [
    "Negative Adjustment(Loan From Future me)",
    "Positive Adjustment(Loan from Past me)",
]

SEED_DATA = {
    "EXPENSE_CATEGORY":  EXPENSE_CATEGORIES,
    "CREDIT_CARD":       CREDIT_CARDS,
    "MONTHLY_MUST":      MONTHLY_MUST,
    "TOTALLY_ESSENTIAL": TOTALLY_ESSENTIAL,
    "ASSET_CATEGORY":    ASSET_CATEGORIES,
    "ASSET_HOLDER":      ASSET_HOLDERS,
    "ASSET_SUB_CATEGORY": ASSET_SUB_CATEGORIES,
    "IGNORE_CATEGORY":   IGNORE_CATEGORIES,
}


def seed():
    db = SessionLocal()
    try:
        # Seed admin user
        if not db.query(User).filter_by(username="admin").first():
            user = User(username="admin", password_hash=hash_password("admin123"))
            db.add(user)
            db.commit()
            print("Created admin user (username=admin, password=admin123)")
        else:
            print("Admin user already exists — skipped")

        # Seed config items
        total_added = 0
        for list_type, values in SEED_DATA.items():
            for i, value in enumerate(values):
                existing = db.query(ConfigItem).filter_by(list_type=list_type, value=value).first()
                if not existing:
                    db.add(ConfigItem(list_type=list_type, value=value, sort_order=i))
                    total_added += 1
        db.commit()
        print(f"Seeded {total_added} config items")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seed complete.")
