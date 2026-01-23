import json
import numpy as np
import random
import re
import sys

# ==========================================
# CẤU HÌNH
# ==========================================
COLORS = [
    "#E91E63", "#F44336", "#9C27B0", "#673AB7",
    "#3F51B5", "#2196F3", "#03A9F4", "#00BCD4",
    "#009688", "#4CAF50", "#8BC34A", "#CDDC39",
    "#FFEB3B", "#FFC107", "#FF9800", "#FF5722"
]


# ==========================================
# LOGIC SINH VÉ (GIỮ NGUYÊN TÍNH CHẶT CHẼ)
# ==========================================

def generate_layout(row_count, col_count, row_target_sum, col_targets):
    """Tạo ma trận 9x9 đảm bảo số lượng số trên dòng và cột."""
    max_restarts = 50
    for _ in range(max_restarts):
        grid = np.zeros((row_count, col_count), dtype=int)
        current_col_counts = np.array(col_targets, dtype=int)
        success = True
        rows_indices = list(range(row_count))
        random.shuffle(rows_indices)

        for r in rows_indices:
            valid_cols = np.where(current_col_counts > 0)[0]
            if len(valid_cols) < row_target_sum:
                success = False
                break
            probs = current_col_counts[valid_cols] / current_col_counts[valid_cols].sum()
            chosen_cols = np.random.choice(valid_cols, size=row_target_sum, replace=False, p=probs)
            grid[r, chosen_cols] = 1
            current_col_counts[chosen_cols] -= 1

        if success and np.all(current_col_counts == 0):
            return grid
    return None


def generate_pair_data(pair_start_id, color, used_rows_hashes):
    """Sinh cặp vé thỏa mãn quy tắc 1-90 và không trùng lặp dòng."""
    col_totals = [9, 10, 10, 10, 10, 10, 10, 10, 11]

    attempts = 0
    while True:
        attempts += 1
        if attempts > 2000:
            raise Exception("Không tìm được phương án phân phối số. Hãy thử lại.")

        # 1. Phân phối số lượng
        counts_a = []
        counts_b = []
        valid_split = False
        for _ in range(50):
            temp_a = []
            for c_tot in col_totals:
                low = max(1, c_tot - 6)
                high = min(c_tot - 1, 6)
                choices = []
                for x in range(low, high + 1):
                    weight = 10 if x == 5 else 1
                    choices.extend([x] * weight)
                val = random.choice(choices)
                temp_a.append(val)
            if sum(temp_a) == 45:
                counts_a = temp_a
                counts_b = [t - a for t, a in zip(col_totals, temp_a)]
                valid_split = True
                break

        if not valid_split: continue

        # 2. Tạo Layout
        grid_a = generate_layout(9, 9, 5, counts_a)
        if grid_a is None: continue
        grid_b = generate_layout(9, 9, 5, counts_b)
        if grid_b is None: continue

        # 3. Phân phối số
        pools = []
        start_num = 1
        for c_tot in col_totals:
            end_num = start_num + c_tot
            nums = list(range(start_num, end_num))
            random.shuffle(nums)
            pools.append(nums)
            start_num = end_num

        vals_a, vals_b = [], []
        for i in range(9):
            n = counts_a[i]
            col_nums = pools[i]
            vals_a.append(sorted(col_nums[:n]))
            vals_b.append(sorted(col_nums[n:]))

        # 4. Fill Rows
        def fill_rows(grid, col_values):
            rows = []
            cv = [x[:] for x in col_values]
            for r in range(9):
                row_data = []
                for c in range(9):
                    if grid[r, c] == 1:
                        val = cv[c].pop(0)
                        row_data.append(val)
                    else:
                        row_data.append(None)
                rows.append(row_data)
            return rows

        rows_a = fill_rows(grid_a, vals_a)
        rows_b = fill_rows(grid_b, vals_b)

        # 5. Check Uniqueness
        current_hashes = set()
        overlap = False
        for r in rows_a + rows_b:
            h = tuple(r)
            if h in used_rows_hashes or h in current_hashes:
                overlap = True
                break
            current_hashes.add(h)

        if overlap: continue

        return (
            {"id": pair_start_id, "color": color, "rows": rows_a},
            {"id": pair_start_id + 1, "color": color, "rows": rows_b},
            current_hashes
        )


# ==========================================
# HÀM FORMAT JSON STRING (Dùng chung)
# ==========================================
def get_compact_json_str(data):
    """
    Chuyển đổi dữ liệu Python thành chuỗi JSON được format đẹp (1 dòng/row).
    """
    json_str = json.dumps(data, indent=2)

    # Regex để tìm các mảng số [null, 1, 2...] và xóa xuống dòng
    def compact_match(match):
        content = match.group(1)
        compact_content = re.sub(r'\s+', ' ', content).strip()
        compact_content = compact_content.replace(' ,', ',')
        return f"[{compact_content}]"

    # Áp dụng Regex
    formatted_str = re.sub(r'\[\s*((?:null|\d+|,\s*)+)\s*\]', compact_match, json_str)
    return formatted_str


# ==========================================
# MAIN PROGRAM
# ==========================================
def main():
    print("--- BINGO 90 GENERATOR (JSON + JS) ---")
    try:
        num_pairs = int(input("Nhập số lượng CẶP vé muốn sinh (VD: 8): "))
    except ValueError:
        print("Vui lòng nhập số hợp lệ.")
        return

    all_tickets = []
    global_row_hashes = set()
    start_id = 101  # Bắt đầu từ ID 101 như mẫu

    print(f"\nĐang xử lý sinh {num_pairs} cặp vé...")

    for i in range(num_pairs):
        color = COLORS[i % len(COLORS)]
        try:
            t_a, t_b, new_hashes = generate_pair_data(start_id, color, global_row_hashes)
            all_tickets.append(t_a)
            all_tickets.append(t_b)
            global_row_hashes.update(new_hashes)
            start_id += 2
            sys.stdout.write(f"\r-> Đã sinh cặp {i + 1}/{num_pairs} (ID {t_a['id']}-{t_b['id']})")
            sys.stdout.flush()
        except Exception as e:
            print(f"\nLỗi: {e}")
            break

    # --- BƯỚC QUAN TRỌNG: FORMAT DỮ LIỆU ---
    print("\n\nĐang định dạng dữ liệu...")
    json_content = get_compact_json_str(all_tickets)

    # 1. Lưu file .json thuần túy
    json_filename = 'tickets.json'
    with open(json_filename, 'w', encoding='utf-8') as f:
        f.write(json_content)
    print(f"[OK] Đã tạo file: {json_filename}")

    # 2. Lưu file data.js (Bọc trong biến const ticketData)
    js_filename = 'data.js'
    js_content = f"// File: data.js generated by Python Script\nconst ticketData = {json_content};\n"

    with open(js_filename, 'w', encoding='utf-8') as f:
        f.write(js_content)
    print(f"[OK] Đã tạo file: {js_filename}")

    print("\nHoàn tất! Bạn có thể sử dụng ngay file data.js.")


if __name__ == "__main__":
    main()
