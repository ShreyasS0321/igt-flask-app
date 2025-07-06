from flask import Flask, render_template, request, jsonify
import pandas as pd
from datetime import datetime
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/submit', methods=['POST'])
def submit():
    data = request.json
   
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    out_dir = "submissions"
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"igt_results_{timestamp}.csv")
    df = pd.DataFrame(data['results'])
    df.to_csv(out_path, index=False)

    return jsonify({"status": "success", "file": out_path})

if __name__ == "__main__":
    app.run(debug=True)
