import img1 from '../imgs/img1.jpg'

//styles
import styles from '../styles/AboutUs.module.css'


const AboutUs = () => {
    return (
        <div>
            <h1 className={styles.title} >About MTGCollector</h1>
            <div>
                <img src={img1} className={styles.image1}/>
            </div>
            <div className={styles.text}>
            <p>I'm thsilvadev but you can call me Thiagosauro, a casual <i>Magic: The Gathering</i> player. I used to play it 13 years ago back in the school days. Classic nerd twelve year olds group started to visit "Pergaminho" (word for Scroll, in english), a RPG store near our school. There we took part in dubious RPG sessions until the dungeon's keepers showed us Magic. It was unbeliavably magical. We all know it is.</p> <br/>
            <p>Unfortunately at that time I had to choose between eating/going to the near LAN House and buying cards. So I pretty much stopped playing MTG until recently I bought 467 cards. With that amount, how many decks are possible? Soon I realized, though, I had few good cards I wish to use in more than one deck. But interchanging 'em like that would get a bit confused, I'd had to take notes and... why not make a digital collectior? That's just it! </p>
            <p> And it's public! Enjoy! And if you have any doubts or feedback, please contact us at <a href="/contact">here</a>, it would be much appreciated!</p>
            </div>
        </div>
    )
}


export default AboutUs;