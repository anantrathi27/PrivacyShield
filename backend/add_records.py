
from database import get_connection, add_audit_log

def add_employee():
    print("\n--- ADD NEW EMPLOYEE ---")

    name = input("Employee name: ").strip()
    email = input("Email: ").strip()
    phone = input("Phone: ").strip()

    try:
        salary = float(input("Salary: "))
    except ValueError:
        print("Invalid salary. Please enter a number.")
        return

    if not name or not email:
        print("Name and email are required.")
        return

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO employees
            (full_name, email, phone, salary)
            VALUES (?, ?, ?, ?)
            """,
            (name, email, phone, salary)
        )
        employee_id = cursor.lastrowid
        conn.commit()

    add_audit_log(
        action="Employee Created",
        details=f"Added employee record ID {employee_id}",
        severity="Info",
        status="Success",
        actor="demo_admin"
    )

    print(f"\nEmployee added! ID: {employee_id}")


def add_customer():
    print("\n--- ADD NEW CUSTOMER ---")

    name = input("Customer name: ").strip()
    email = input("Email: ").strip()
    phone = input("Phone: ").strip()
    card = input("Fictional demo card number: ").strip()

    if not name or not email:
        print("Name and email are required.")
        return

    with get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO customers
            (full_name, email, phone, card_number)
            VALUES (?, ?, ?, ?)
            """,
            (name, email, phone, card)
        )
        customer_id = cursor.lastrowid
        conn.commit()

    add_audit_log(
        action="Customer Created",
        details=f"Added customer record ID {customer_id}",
        severity="Info",
        status="Success",
        actor="demo_admin"
    )

    print(f"\nCustomer added! ID: {customer_id}")


def main():
    with get_connection() as conn:
        tables = {
            row[0]
            for row in conn.execute(
                "SELECT name FROM sqlite_master "
                "WHERE type='table'"
            )
        }

    print("\n=== PRIVACYSHIELD DATABASE MANAGEMENT ===")
    print("1. Add Employee")
    print("2. Add Customer")

    choice = input("\nEnter choice: ").strip()

    if choice == "1":
        if "employees" not in tables:
            print("Employees table does not exist.")
            return
        add_employee()

    elif choice == "2":
        if "customers" not in tables:
            print(
                "Customers table does not exist. "
                "Check database.py before continuing."
            )
            return
        add_customer()

    else:
        print("Invalid choice.")


if __name__ == "__main__":
    main()
