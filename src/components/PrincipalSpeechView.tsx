import React from 'react';
import { IMAGES } from '../assets/images';
import { formatNip } from '../utils/formatNip';

interface PrincipalSpeechViewProps {
  onNavigate: (tab: string) => void;
}

export const PrincipalSpeechView: React.FC<PrincipalSpeechViewProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-10 lg:py-16 space-y-12">
      {/* Header Breadcrumb & Title */}
      <div className="border-b border-slate-200 pb-6 space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue-900 uppercase tracking-widest">
          <button onClick={() => onNavigate('beranda')} className="hover:underline">Beranda</button>
          <span>/</span>
          <span>Profil Sekolah</span>
          <span>/</span>
          <span className="text-slate-500">Sambutan Kepala Sekolah</span>
        </div>
        <h1 className="font-serif-title text-3xl sm:text-4xl font-bold text-slate-900">
          Sambutan Kepala SMA Negeri 1 Halmahera Tengah
        </h1>
        <p className="text-sm text-slate-500">
          Refleksi Visi Pendidikan Menuju Insan Berkarakter Luhur Fagogoru & Berdaya Saing Global
        </p>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Principal Profile Card */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 sticky top-24">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden ring-1 ring-slate-200 bg-slate-100">
              <img
                src={IMAGES.principalPortrait}
                alt="Abdul Kadir Talib, S.Pd.I., M.Pd. - Kepala SMAN 1 Halmahera Tengah"
                className="w-full h-full object-cover object-top"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="space-y-1.5 text-center">
              <h3 className="font-bold text-slate-900 text-base">
                Abdul Kadir Talib, S.Pd.I., M.Pd.
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                NIP. {formatNip('197507062003121005')}
              </p>
              <div className="inline-block px-2.5 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-900 mt-1">
                Kepala SMA Negeri 1 Halmahera Tengah
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 text-xs space-y-2 text-slate-600">
              <div>
                <span className="font-semibold text-slate-800 block">Pendidikan:</span>
                <span>S1 Pendidikan Fisika dan S2 Magister Pendidikan, Universitas Khairun (Unkhair) Ternate</span>
              </div>
              <div>
                <span className="font-semibold text-slate-800 block">Pengabdian:</span>
                <span>Penggerak Transformasi Mutu Pendidikan Kabupaten Halmahera Tengah.
                  Kepala Sekolah SMA Negeri 5 Halmahera Tengah (2025).
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Right: Editorial Speech Body */}
        <article className="lg:col-span-8 space-y-6 text-slate-700 leading-relaxed text-sm sm:text-base">
          <div className="border-b border-slate-200 pb-4">
            <p className="font-semibold text-slate-900 text-lg">
              Assalamu’alaikum Warahmatullahi Wabarakatuh,
              <br />
              Salam Sejahtera, Shalom, Om Swastyastu, Namo Buddhaya, Salam Kebajikan.
            </p>
          </div>

          {/* Opening Paragraph with Drop Cap */}
          <p className="first-letter:text-5xl first-letter:font-serif first-letter:font-bold first-letter:text-blue-950 first-letter:float-left first-letter:mr-3 first-letter:mt-1 leading-relaxed">
            Puji dan syukur senantiasa kita panjatkan ke hadirat Allah Swt., Tuhan Yang Maha Esa, atas segala limpahan rahmat dan karunia-Nya. Adalah suatu kehormatan dan amanah mulia bagi kami segenap pendidik dan tenaga kependidikan di SMA Negeri 1 Halmahera Tengah untuk menyambut seluruh peserta didik, orang tua, alumni, dan masyarakat luas di laman resmi sekolah tercinta.
          </p>

          <p>
            Kabupaten Halmahera Tengah, khususnya kawasan Weda, kini berkembang pesat sebagai salah satu episentrum pembangunan strategis di Provinsi Maluku Utara. Dinamika ini menuntut dunia pendidikan untuk tidak sekadar mencetak lulusan berijazah, melainkan membentuk insan pembelajar yang berkarakter kokoh, menguasai ilmu sains dan teknologi modern, serta menjunjung tinggi kearifan lokal <strong>Fagogoru</strong>.
          </p>

          {/* Pull Quote */}
          <figure className="my-8 border-l-4 border-blue-900 pl-6 py-2 bg-blue-50/50 rounded-r-lg">
            <blockquote className="font-serif italic text-base sm:text-lg text-blue-950 font-medium leading-snug">
              “Kecerdasan nalar dan kemahiran teknologi akan bermakna sejati apabila berpadu dengan ketulusan budi pekerti Fagogoru: saling menyayangi, menghormati, dan tolong-menolong.”
            </blockquote>
            <figcaption className="text-xs text-slate-500 mt-2 font-sans font-medium">
              — Abdul Kadir Talib, S.Pd.I., M.Pd.
            </figcaption>
          </figure>

          <p>
            Melalui implementasi <strong>Kurikulum Merdeka</strong>, SMA Negeri 1 Halmahera Tengah memberikan ruang seluas-luasnya bagi peserta didik untuk mengembangkan potensi intelektual, minat riset lingkungan hidup pesisir dan bahari Teluk Weda, kemampuan literasi digital, hingga kepemimpinan organisasi kesiswaan.
          </p>

          <p>
            Kepada calon peserta didik baru yang ingin bergabung melalui PPDB tahun ini, pintu kami senantiasa terbuka lebar bagi generasi muda yang haus akan ilmu, pantang menyerah, dan bertekad mengukir prestasi bagi tanah Fagogoru.
          </p>

          <p>
            Akhir kata, kami sampaikan terima kasih dan apresiasi setinggi-tingginya kepada seluruh pihak: para orang tua murid, Pemerintah Daerah Kabupaten Halmahera Tengah, Dinas Pendidikan Provinsi Maluku Utara, serta masyarakat yang tak henti-hentinya mendukung kemajuan sekolah kita.
          </p>

          <p className="font-semibold text-slate-900 pt-4">
            Wassalamu’alaikum Warahmatullahi Wabarakatuh.
          </p>

          {/* Official Sign-off & Stamp */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Dilantik pada Rabu, 15 April 2026</p>
              <p className="text-xs text-slate-900 font-bold">
                Abdul Kadir Talib, S.Pd.I., M.Pd.
              </p>
              <p className="text-xs text-slate-500 font-mono">NIP. {formatNip('197507062003121005')}</p>
            </div>
            <div className="border border-blue-900/30 rounded-lg p-3 text-center bg-blue-50/30">
              <span className="font-serif-title text-xs font-bold text-blue-950 block">TERVERIFIKASI RESMI</span>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest">DINAS PENDIDIKAN MALUKU UTARA</span>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
};
