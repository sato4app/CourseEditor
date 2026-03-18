// メインアプリケーション

import { MODES } from './constants.js';
import { initializeMap } from './mapCore.js';
import { setupExcelInput, setupGeoJsonInput, setupExportButton } from './fileIO.js';
import { setupCourseEditor } from './courseEditor.js';

// 地図とレイヤーの初期化
const { map, dataLayer } = initializeMap();

// ファイル入出力の設定
setupExcelInput(dataLayer);
setupGeoJsonInput(dataLayer);
setupExportButton();

// コースエディタの設定
setupCourseEditor();

// モード切り替え処理
document.querySelectorAll('input[name="mode"]').forEach(radio => {
    radio.addEventListener('change', function () {
        // ラジオボタンの選択スタイルを更新
        document.querySelectorAll('.control-section label span').forEach(span => {
            span.classList.remove('selected');
        });
        if (this.checked) {
            this.nextElementSibling.classList.add('selected');
        }

        // パネルの表示切り替え
        document.getElementById('fileIoPanel').style.display =
            this.value === MODES.FILEIO ? 'block' : 'none';
        document.getElementById('coursePanel').style.display =
            this.value === MODES.COURSE ? 'block' : 'none';
        document.getElementById('photoPanel').style.display =
            this.value === MODES.PHOTO ? 'block' : 'none';
    });
});
