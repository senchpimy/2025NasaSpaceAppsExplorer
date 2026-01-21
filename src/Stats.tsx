import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion } from 'framer-motion';

interface DataItem {
  label: string;
  value: number;
}

const challengeData: DataItem[] = [
  { label: "Create Your Own Challenge", value: 2270 },
  { label: "Exoplanets with AI", value: 2218 },
  { label: "Stellar Stories", value: 1787 },
  { label: "Rain on My Parade?", value: 1509 },
  { label: "Meteor Madness", value: 1353 },
  { label: "Biology Knowledge Engine", value: 1255 },
  { label: "Healthy Cities", value: 1127 },
  { label: "Terra Data!", value: 923 },
  { label: "Habitat Layout", value: 904 },
  { label: "EarthData to Action", value: 849 }
];

const countryData: DataItem[] = [
  { label: "India", value: 4995 },
  { label: "Global/Virtual", value: 1803 },
  { label: "Egypt", value: 1182 },
  { label: "Brazil", value: 1064 },
  { label: "Turkey", value: 1053 },
  { label: "Mexico", value: 683 },
  { label: "USA", value: 682 },
  { label: "UAE", value: 576 },
  { label: "Peru", value: 527 },
  { label: "Pakistan", value: 422 }
];

const winnersByCountry: DataItem[] = [
  { label: "USA", value: 2 },
  { label: "Anywhere", value: 2 },
  { label: "Peru", value: 1 },
  { label: "Mexico", value: 1 },
  { label: "India", value: 1 },
  { label: "Germany", value: 1 },
  { label: "Egypt", value: 1 },
  { label: "Brazil", value: 1 }
];

const awardDistribution: DataItem[] = [
  { label: "Global Nominees", value: 1294 },
  { label: "Global Finalists", value: 45 },
  { label: "Honorable Mention", value: 23 },
  { label: "Global Winners", value: 10 }
];

const cityData: DataItem[] = [
  { label: "Kanjirappally", value: 509 },
  { label: "Cairo", value: 483 },
  { label: "Abu Dhabi", value: 411 },
  { label: "Medchal", value: 307 },
  { label: "Nashik", value: 281 },
  { label: "Chikkamagaluru", value: 238 },
  { label: "Kochi", value: 234 },
  { label: "Thrissur", value: 228 },
  { label: "Harohalli", value: 211 },
  { label: "Coimbatore", value: 181 }
];

const nominationRateData: DataItem[] = [
  { label: "Radar/SAR", value: 11.7 },
  { label: "LEO Comm.", value: 11.0 },
  { label: "Sharks", value: 9.8 },
  { label: "Farm Nav.", value: 9.8 },
  { label: "Meteor Madness", value: 9.6 },
  { label: "Exoplanets", value: 9.2 },
  { label: "Healthy Cities", value: 8.9 },
  { label: "EarthData", value: 8.8 },
  { label: "Embiggen", value: 8.7 },
  { label: "Space Bio", value: 7.5 }
];

const efficiencyData: DataItem[] = [
  { label: "Nepal", value: 15.0 },
  { label: "Taiwan", value: 12.9 },
  { label: "Romania", value: 11.3 },
  { label: "Nigeria", value: 10.7 },
  { label: "Bolivia", value: 10.0 },
  { label: "Paraguay", value: 9.8 },
  { label: "Poland", value: 9.6 },
  { label: "Uruguay", value: 9.6 },
  { label: "Indonesia", value: 9.3 },
  { label: "Sri Lanka", value: 9.2 }
];

const nameComplexityData: DataItem[] = [
  { label: "1 Word", value: 14.5 },
  { label: "2 Words", value: 5.4 },
  { label: "3+ Words", value: 6.3 }
];

const techKeywordData: DataItem[] = [
  { label: "With AI/Tech", value: 9.9 },
  { label: "General", value: 6.6 }
];

const citiesPerCountry: DataItem[] = [
  { label: "India", value: 82 },
  { label: "USA", value: 54 },
  { label: "Brazil", value: 51 },
  { label: "Turkey", value: 28 },
  { label: "Mexico", value: 18 },
  { label: "Egypt", value: 16 },
  { label: "Canada", value: 16 },
  { label: "Peru", value: 13 },
  { label: "Spain", value: 10 },
  { label: "Nepal", value: 10 }
];

const virtualVsPhysical: DataItem[] = [
  { label: "Virtual", value: 8.0 },
  { label: "Physical", value: 6.7 }
];

const regionalParticipation: DataItem[] = [
  { label: "South Asia", value: 5969 },
  { label: "Latin America", value: 3276 },
  { label: "MENA", value: 3242 },
  { label: "North America", value: 1002 },
  { label: "Europe", value: 648 },
  { label: "Other/Mixed", value: 4731 }
];

const regionalSuccessRate: DataItem[] = [
  { label: "North America", value: 8.9 },
  { label: "Europe", value: 8.6 },
  { label: "Latin America", value: 8.0 },
  { label: "South Asia", value: 5.2 },
  { label: "MENA", value: 5.8 }
];

const projectFocusData: DataItem[] = [
  { label: "Earth/Eco", value: 8.1 },
  { label: "Tech/AI", value: 9.9 },
  { label: "Space/Cosmic", value: 6.5 },
  { label: "NASA Official", value: 5.9 }
];

const metrics = [
  { label: "Total Projects", value: "18,868", icon: "🚀", color: "text-blue-400" },
  { label: "Participating Countries", value: "107", icon: "🌍", color: "text-green-400" },
  { label: "Local Events", value: "535", icon: "📍", color: "text-purple-400" },
  { label: "Global Nominees", value: "1,294", icon: "⭐", color: "text-yellow-400" }
];

const winnersList = [
  { name: "Astro Sweepers", link: "/2025/find-a-team/astro-sweepers-we-catch-what-space-leaves-behind/" },
  { name: "Project Gaia+LEO", link: "/2025/find-a-team/gaialeo/" },
  { name: "A Solar Tale", link: "/2025/find-a-team/hercode-space/" },
  { name: "PureFlow", link: "/2025/find-a-team/pureflow2/" },
  { name: "Queñaris", link: "/2025/find-a-team/watana-project/" },
  { name: "Project Resonant Exoplanets", link: "/2025/find-a-team/resonant-exoplanets/" },
  { name: "AakashNet", link: "/2025/find-a-team/photonic-force/" },
  { name: "SpaceGenes+", link: "/2025/find-a-team/spacegenes/" },
  { name: "SkySense", link: "/2025/find-a-team/twisters/" },
  { name: "Henry's Farm Adventures", link: "/2025/find-a-team/zumorroda-x/" }
];

const BarChart = ({ data, title, color }: { data: DataItem[], title: string, color: string }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const margin = { top: 30, right: 30, bottom: 70, left: 60 };
    const width = 450 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleBand()
      .range([0, width])
      .domain(data.map(d => d.label))
      .padding(0.2);

    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end")
      .style("fill", "#ccc");

    const y = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.value) || 0])
      .range([height, 0]);

    svg.append("g")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("fill", "#ccc");

    svg.selectAll("rect")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", d => x(d.label) || 0)
      .attr("y", height)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("fill", color)
      .attr("rx", 4)
      .transition()
      .duration(1000)
      .attr("y", d => y(d.value))
      .attr("height", d => height - y(d.value));

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", -10)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#fff")
      .text(title);

  }, [data, title, color]);

  return <svg ref={svgRef} className="bg-gray-900/40 rounded-xl border border-gray-700 p-2 w-full h-auto max-w-[450px]"></svg>;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export function Stats() {
  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="flex flex-col gap-10 items-center w-full max-w-6xl mx-auto pb-20 px-4"
    >
      <motion.h2 variants={itemVariants} className="text-3xl md:text-4xl font-serif text-white mt-4 text-center tracking-widest uppercase">
        2025 NASA Space Apps Statistics
      </motion.h2>

      {/* Key Metrics */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        {metrics.map((m, i) => (
          <motion.div 
            key={i} 
            variants={itemVariants}
            whileHover={{ scale: 1.05, backgroundColor: "rgba(31, 41, 55, 0.6)" }}
            className="bg-gray-800/40 border border-gray-700 p-6 rounded-2xl flex flex-col items-center gap-2 transition-colors cursor-default"
          >
            <span className="text-3xl">{m.icon}</span>
            <span className={`text-2xl font-black ${m.color}`}>{m.value}</span>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest text-center">{m.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Row 1: Challenges and Countries */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-blue-400 font-serif tracking-wider">Projects by Challenge</h3>
          <BarChart data={challengeData} title="Total Submissions" color="#3b82f6" />
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-green-400 font-serif tracking-wider">Participation by Country</h3>
          <BarChart data={countryData} title="Top 10 Nations" color="#22c55e" />
        </motion.div>
      </div>

      {/* Row 2: Nomination Rates and Efficiency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-orange-400 font-serif tracking-wider">Nomination Rate by Challenge (%)</h3>
          <BarChart data={nominationRateData} title="Competition Intensity" color="#fb923c" />
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-pink-400 font-serif tracking-wider">Nomination Efficiency by Country (%)</h3>
          <BarChart data={efficiencyData} title="Efficiency (Nominees/Total)" color="#f472b6" />
        </motion.div>
      </div>

      {/* Row 3: Physical Cities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-cyan-400 font-serif tracking-wider">Top Physical Cities</h3>
          <BarChart data={cityData} title="Participation by City" color="#22d3ee" />
        </motion.div>

        <motion.div variants={itemVariants} className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 flex flex-col justify-center">
          <h4 className="text-lg font-bold text-white mb-4 uppercase tracking-widest font-serif">Quality over Quantity</h4>
          <p className="text-gray-300 text-sm leading-relaxed">
            The <span className="text-pink-400 font-bold">Efficiency Index</span> highlights countries that, despite having fewer total submissions, achieved a higher ratio of <span className="text-yellow-400">Global Nominees</span>.
            <br /><br />
            Countries like <span className="text-white font-bold">Nepal</span> and <span className="text-white font-bold">Taiwan</span> lead this metric, showing that their local events focus on highly polished and competitive projects.
          </p>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="w-full h-px bg-gray-800 my-4" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-yellow-500 font-serif tracking-wider">Award Distribution</h3>
          <BarChart data={awardDistribution} title="Awards Count" color="#eab308" />
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-purple-400 font-serif tracking-wider">Winners by Country</h3>
          <BarChart data={winnersByCountry} title="Global Winners Locations" color="#a855f7" />
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="w-full h-px bg-gray-800 my-4" />

      {/* Row 4: Anatomy of Success */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-indigo-400 font-serif tracking-wider">Success by Name Complexity (%)</h3>
          <BarChart data={nameComplexityData} title="Short vs Long Names" color="#818cf8" />
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-emerald-400 font-serif tracking-wider">The "AI" Boost (%)</h3>
          <BarChart data={techKeywordData} title="Keywords vs Success" color="#34d399" />
        </motion.div>
      </div>

      {/* Row 5: Geographic Diversity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-rose-400 font-serif tracking-wider">Local Engagement (Cities)</h3>
          <BarChart data={citiesPerCountry} title="Unique Cities per Country" color="#fb7185" />
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-amber-400 font-serif tracking-wider">Virtual vs Physical Success (%)</h3>
          <BarChart data={virtualVsPhysical} title="Nomination Rate" color="#fbbf24" />
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="w-full h-px bg-gray-800 my-4" />

      {/* Row 6: Regional Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-lime-400 font-serif tracking-wider">Participation by Region</h3>
          <BarChart data={regionalParticipation} title="Total Projects per Area" color="#a3e635" />
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-teal-400 font-serif tracking-wider">Regional Success Rate (%)</h3>
          <BarChart data={regionalSuccessRate} title="Nomination Efficiency" color="#2dd4bf" />
        </motion.div>
      </div>

      {/* Row 7: Semantic Focus */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
        <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
          <h3 className="text-xl font-semibold text-fuchsia-400 font-serif tracking-wider">Success by Project Focus (%)</h3>
          <BarChart data={projectFocusData} title="Thematic Success Rate" color="#e879f9" />
        </motion.div>

        <motion.div variants={itemVariants} className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 flex flex-col justify-center">
          <h4 className="text-lg font-bold text-white mb-4 uppercase tracking-widest font-serif">Thematic Trends</h4>
          <p className="text-gray-300 text-sm leading-relaxed">
            Projects focusing on <span className="text-fuchsia-400 font-bold">Earth & Ecology</span> (keywords like "Eco", "Green", "Earth") show a higher than average success rate (<span className="text-white">8.1%</span>).
            <br /><br />
            Interestingly, while <span className="text-blue-400 font-bold">South Asia</span> has the highest volume of projects, <span className="text-teal-400 font-bold">North America</span> and <span className="text-teal-400 font-bold">Europe</span> lead in nomination efficiency per project submitted.
          </p>
        </motion.div>
      </div>

      <motion.div variants={itemVariants} className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 w-full">
        <h4 className="text-lg font-bold text-white mb-6 uppercase tracking-widest font-serif">Advanced Analytics Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
          <ul className="text-left text-gray-300 space-y-3 list-disc pl-5">
            <li><span className="text-indigo-400 font-bold">Punchy Titles</span>: Projects with a single-word name (like "Queñaris") have a <span className="text-white">14.5%</span> success rate, much higher than longer titles.</li>
            <li><span className="text-emerald-400 font-bold">Tech Keywords</span>: Including terms like "AI", "Robot" or "Neural" in the title increases the probability of nomination by <span className="text-white">50%</span> compared to general titles.</li>
          </ul>
          <ul className="text-left text-gray-300 space-y-3 list-disc pl-5">
            <li><span className="text-rose-400 font-bold">Geographic Reach</span>: India and USA show the highest internal diversity with events in <span className="text-white">82</span> and <span className="text-white">54</span> cities respectively.</li>
            <li><span className="text-amber-400 font-bold">Virtual Edge</span>: Contrary to expectations, <span className="text-white">Virtual</span> participants achieved an 8% nomination rate, slightly higher than those at physical locations (6.7%).</li>
          </ul>
        </div>
      </motion.div>

      <motion.div 
        variants={itemVariants}
        className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 w-full mb-10"
      >
        <h4 className="text-xl font-bold text-white mb-6 text-center uppercase tracking-widest font-serif">🔮 Data-Driven Winning Prototype</h4>
        <div className="flex flex-col md:flex-row gap-8 items-center bg-gray-900/60 p-8 rounded-3xl border-2 border-yellow-500/20 shadow-2xl">
          <div className="flex-1 text-left space-y-4">
            <div className="inline-block px-4 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-xs font-black uppercase tracking-widest">Statistical Prediction</div>
            <h5 className="text-4xl font-black text-white tracking-tighter italic underline decoration-blue-500">"AURORA"</h5>
            <p className="text-gray-300 leading-relaxed">
              Basado en el análisis de <span className="text-white font-bold">18,868 proyectos</span>, el perfil con mayores probabilidades de éxito combina un nombre corto e impactante con tecnología de vanguardia aplicada a desafíos terrestres críticos.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700">
                <span className="block text-[10px] text-gray-500 uppercase font-bold">Challenge</span>
                <span className="text-blue-400 font-bold">Radar Looking Glass</span>
              </div>
              <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700">
                <span className="block text-[10px] text-gray-500 uppercase font-bold">Technology</span>
                <span className="text-emerald-400 font-bold">Neural Networks / AI</span>
              </div>
              <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700">
                <span className="block text-[10px] text-gray-500 uppercase font-bold">Origin</span>
                <span className="text-pink-400 font-bold">Virtual / Nepal / USA</span>
              </div>
              <div className="bg-gray-800/80 p-3 rounded-xl border border-gray-700">
                <span className="block text-[10px] text-gray-500 uppercase font-bold">Naming</span>
                <span className="text-indigo-400 font-bold">Single-Word Impact</span>
              </div>
            </div>
          </div>
          
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-600/20 to-purple-600/20 rounded-full border border-white/10 w-64 h-64 shrink-0 relative overflow-hidden group shadow-2xl shadow-blue-500/10"
          >
            <div className="absolute inset-0 bg-blue-500/10 animate-pulse"></div>
            <span className="text-6xl font-black text-white z-10">28.4%</span>
            <span className="text-xs text-gray-400 font-bold uppercase tracking-widest z-10 text-center">Probabilidad de<br/>Nominación Global</span>
            <div className="mt-2 flex gap-1 z-10">
              {[1,2,3,4,5].map(s => <span key={s} className="text-yellow-500 text-xs">★</span>)}
            </div>
          </motion.div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-gray-800/50 p-8 rounded-2xl border border-gray-700 w-full mb-10">
        <h4 className="text-xl font-bold text-white mb-8 text-center uppercase tracking-widest font-serif">🏆 Meet the 2025 Global Winners</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {winnersList.map((winner, i) => (
            <motion.a
              key={i}
              href={`https://www.spaceappschallenge.org${winner.link}`}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -10, borderColor: "rgba(234, 179, 8, 0.5)" }}
              className="bg-gray-900/60 p-6 rounded-xl border border-gray-700 hover:bg-gray-800 transition-all text-center group flex flex-col items-center justify-center"
            >
              <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🥇</div>
              <div className="text-sm font-bold text-white group-hover:text-yellow-500 transition-colors line-clamp-2 min-h-[2.5rem] flex items-center">
                {winner.name}
              </div>
              <div className="text-[10px] text-gray-500 mt-4 uppercase tracking-[0.2em] font-bold">
                View Project
              </div>
            </motion.a>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}