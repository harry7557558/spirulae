#pragma once

// thanks ChatGPT

#include <vector>

class MaxSegmentTree {
private:
    int n; // Size of the array
    std::vector<std::pair<int, float>> tree; // Store a pair of (index, value)
    std::vector<float> arr;

    // Function to build the segment tree
    void buildTree(const std::vector<float>& arr, int v, int tl, int tr) {
        if (tl == tr) {
            tree[v] = std::make_pair(tl, arr[tl]);
        } else {
            int tm = (tl + tr) / 2;
            buildTree(arr, v * 2, tl, tm);
            buildTree(arr, v * 2 + 1, tm + 1, tr);
            auto left = tree[v * 2];
            auto right = tree[v * 2 + 1];
            tree[v] = (left.second >= right.second) ? left : right;
        }
    }

    // Function to update an element at index idx with a new value
    void update(int idx, float newValue, int v, int tl, int tr) {
        if (tl == tr) {
            arr[idx] = newValue;
            tree[v] = std::make_pair(idx, newValue);
        } else {
            int tm = (tl + tr) / 2;
            if (idx <= tm) {
                update(idx, newValue, v * 2, tl, tm);
            } else {
                update(idx, newValue, v * 2 + 1, tm + 1, tr);
            }
            auto left = tree[v * 2];
            auto right = tree[v * 2 + 1];
            tree[v] = (left.second >= right.second) ? left : right;
        }
    }

    // Function to find the maximum element in the range [l, r] and return the index and value
    std::pair<int, float> query(int l, int r, int v, int tl, int tr) {
        if (l > r) {
            return std::make_pair(-1, 0.0);
        }
        if (l == tl && r == tr) {
            return tree[v];
        }
        int tm = (tl + tr) / 2;
        auto left = query(l, std::min(r, tm), v * 2, tl, tm);
        auto right = query(std::max(l, tm + 1), r, v * 2 + 1, tm + 1, tr);
        return (left.second >= right.second) ? left : right;
    }

public:
    MaxSegmentTree(const std::vector<float>& arr) {
        n = arr.size();
        this->arr = arr;
        tree.resize(4 * n); // Size of the segment tree
        buildTree(arr, 1, 0, n - 1);
    }

    // Function to update an element at index idx with a new value
    void update(int idx, float newValue) {
        update(idx, newValue, 1, 0, n - 1);
    }

    // Function to get the maximum element and return the index and value
    std::pair<int, float> getMax() {
        return query(0, n - 1, 1, 0, n - 1);
    }

    // Function to return the value at a given index
    float getValue(int idx) {
        return arr[idx];
    }

};

